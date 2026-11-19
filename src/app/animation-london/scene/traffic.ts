// Road traffic. Every lane is a closed loop round one cell of the street
// grid, hugging it on the left-hand side of the road, so no two lanes ever
// cross and nothing has to give way at a junction. What does stop traffic is
// decided here: a queue forms behind a bus at its stop, behind a closed
// bridge, or at a crossing somebody has stepped out on.
//
// The film can be held at any second and replayed, so where a vehicle is has
// to depend on the time alone. The whole loop is therefore worked out once,
// in small steps, when the first frame asks for it, and looked up after that.

import { V3, clamp } from "../engine/math";
import { Sprite } from "../engine/mesh";
import { Route } from "./motion";
import { Mover } from "./types";

/** A place on the road that is sometimes shut: a lifting bridge, a crossing in use. */
export interface Halt {
  x: number;
  y: number;
  /** Vehicles stop this far short of the point. */
  r: number;
  /** Is it shut at this timeline second? */
  closed: (t: number) => boolean;
}

export interface Vehicle {
  /** Bumper to bumper. */
  len: number;
  /** Cruising speed, units a second. */
  speed: number;
  /** Where on the lane it starts, as a fraction of the lane's length. */
  at: number;
  /** Buses call at the lane's stops. */
  bus?: boolean;
  /** The drawing for a heading; a rider's legs also need the time and whether they are moving. */
  sprite: (heading: number, t: number, moving: boolean) => Sprite;
  /** Set for anything whose drawing changes as it goes (so the mover works out whether it is moving). */
  pedals?: boolean;
  /** Timeline second it first appears (it sketches itself in from then). */
  born: number;
}

export class Lane {
  readonly vehicles: Vehicle[] = [];
  /** Where buses call, as distances along the lane. */
  readonly stops: number[] = [];
  constructor(readonly route: Route) {}

  /** Distance along the lane of the point on it nearest to (x, y), and how far away that is. */
  nearest(x: number, y: number): { s: number; d: number } {
    const p: V3 = [0, 0, 0];
    let best = Infinity;
    let at = 0;
    for (let s = 0; s < this.route.length; s += 0.4) {
      this.route.pos(s, p);
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < best) {
        best = d;
        at = s;
      }
    }
    return { s: at, d: best };
  }
}

const DT = 0.05;
/** The most traffic ever worked out in advance, in seconds. One loop of the film has to fit inside it. */
export const TRAFFIC_HORIZON = 150;
const ACCEL = 3.4;
const BRAKE = 5.5;
const GAP = 0.9;
const DWELL = 2.6;
/** How far short of a stop line, or of the mark at a bus stop, a vehicle pulls up. */
const SHORT = 0.2;

const mod = (v: number, m: number) => ((v % m) + m) % m;

export class Traffic {
  readonly lanes: Lane[] = [];
  readonly halts: Halt[] = [];
  /** For each lane, for each vehicle, its distance along the lane at every step. */
  private table: Float32Array[][] | null = null;
  /** The second the traffic first shows: it is worked out from here on. Set by `mover`. */
  private t0 = 0;

  /**
   * Work the traffic out now, as far as second `until`, rather than in the
   * middle of the first frame that shows a vehicle (where it costs a visible
   * stutter). Call it once the tour is timed: bridges and crossings shut on
   * the camera's cue.
   */
  prepare(until: number): void {
    if (!this.table) this.simulate(until);
  }

  /** Work the traffic out from the second it first shows. Done once: by `prepare`, or failing that the first time a position is asked for. */
  private simulate(until = this.t0 + TRAFFIC_HORIZON): void {
    const from = this.t0;
    const steps = Math.ceil(clamp(until - from, 1, TRAFFIC_HORIZON) / DT) + 1;
    const table: Float32Array[][] = [];
    for (const lane of this.lanes) {
      const L = lane.route.length;
      const n = lane.vehicles.length;
      const rows: Float32Array[] = lane.vehicles.map(() => new Float32Array(steps));
      table.push(rows);
      if (n === 0) continue;
      // who is in front of whom never changes: nobody overtakes
      const order = lane.vehicles.map((_, i) => i).sort((a, b) => lane.vehicles[a].at - lane.vehicles[b].at);
      const ahead = new Array<number>(n);
      for (let k = 0; k < n; k++) ahead[order[k]] = order[(k + 1) % n];
      // stop lines on this lane, from the halts that lie on it
      const lines: { s: number; closed: (t: number) => boolean }[] = [];
      for (const h of this.halts) {
        const near = lane.nearest(h.x, h.y);
        if (near.d < 1.8) lines.push({ s: mod(near.s - h.r, L), closed: h.closed });
      }
      const s = lane.vehicles.map((v) => v.at * L);
      const v = lane.vehicles.map((q) => q.speed);
      const dwell = new Array<number>(n).fill(-1);
      const served = new Array<number>(n).fill(-1);
      const prev = s.slice();
      for (let k = 0; k < steps; k++) {
        const t = from + k * DT;
        for (let i = 0; i < n; i++) prev[i] = s[i];
        for (let i = 0; i < n; i++) {
          const q = lane.vehicles[i];
          rows[i][k] = prev[i];
          const front = prev[i] + q.len / 2;
          let room = Infinity;
          if (n > 1) {
            const j = ahead[i];
            room = mod(prev[j] - lane.vehicles[j].len / 2 - front, L) - GAP;
            // a gap of nearly a whole lap means the two have met nose to tail
            // (with only two on a lane it also means the other is right behind, so the rule cannot be used)
            if (n > 2 && room > L - q.len - lane.vehicles[j].len - GAP * 2) room = 0;
          }
          for (const ln of lines) {
            if (!ln.closed(t)) continue;
            const d = mod(ln.s - front, L);
            // (a line just behind the front bumper is a lap away: the vehicle is already through)
            if (d < L - 1.5) room = Math.min(room, d - SHORT);
          }
          let waiting = false;
          if (q.bus) {
            if (dwell[i] >= 0) {
              if (t < dwell[i]) waiting = true;
              else dwell[i] = -1;
            } else {
              for (let p = 0; p < lane.stops.length; p++) {
                const d = mod(lane.stops[p] - prev[i], L);
                if (p === served[i]) {
                  // forget the stop once the bus is well clear of it
                  if (d > 6 && d < L - 6) served[i] = -1;
                  continue;
                }
                if (d < 16) {
                  // It pulls up a little short of the mark, as at a stop line. A bus that brakes to
                  // the mark itself rolls a hair past it, and a stop just behind a bus is a lap away:
                  // it would crawl up, never quite stand, and drive on without calling.
                  room = Math.min(room, d - SHORT);
                  if (d < SHORT + 0.25 && v[i] < 0.4) {
                    dwell[i] = t + DWELL;
                    served[i] = p;
                    waiting = true;
                  }
                }
              }
            }
          }
          const target = waiting || room <= 0.03 ? 0 : Math.min(q.speed, Math.sqrt(2 * BRAKE * Math.max(0, room)));
          if (v[i] < target) v[i] = Math.min(target, v[i] + ACCEL * DT);
          else v[i] = Math.max(target, v[i] - BRAKE * 1.6 * DT);
          s[i] = prev[i] + v[i] * DT;
        }
      }
    }
    this.table = table;
  }

  /** Distance along its lane of a vehicle at second t. */
  at(lane: number, vehicle: number, t: number): number {
    if (!this.table) this.simulate();
    const row = (this.table as Float32Array[][])[lane][vehicle];
    const q = this.lanes[lane].vehicles[vehicle];
    const u = (t - this.t0) / DT;
    if (u <= 0) return row[0] + q.speed * (t - this.t0);
    const last = row.length - 1;
    if (u >= last) return row[last] + q.speed * (t - this.t0 - last * DT);
    const k = Math.floor(u);
    return row[k] + (row[k + 1] - row[k]) * (u - k);
  }

  /** The one mover that places every vehicle. `from` is the second the traffic first shows, and is worked out from. */
  mover(from: number): Mover {
    this.t0 = from;
    const P: V3 = [0, 0, 0];
    return (m) => {
      for (let a = 0; a < this.lanes.length; a++) {
        const lane = this.lanes[a];
        const route = lane.route;
        for (let b = 0; b < lane.vehicles.length; b++) {
          const q = lane.vehicles[b];
          if (m.t < q.born) continue;
          const s = this.at(a, b, m.t);
          route.pos(s, P);
          if (!m.sees(P[0], P[1], P[2])) continue;
          const moving = q.pedals ? this.at(a, b, m.t + 0.12) - s > 0.02 : true;
          m.put(q.sprite(route.heading(s, Math.min(q.len * 0.55, 4.2)), m.t, moving), P[0], P[1], P[2], q.born);
        }
      }
    };
  }
}
