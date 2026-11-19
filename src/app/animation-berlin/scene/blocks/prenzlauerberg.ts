// Prenzlauer Berg on a Sunday: the Mauerpark's stone amphitheatre full to the
// top for the karaoke, the old hinterland wall behind it sprayed from end to
// end, and the giant swings; the flea market; the fat brick water tower with
// a playground at its foot; restored tenements with brunch on the pavement
// and a pram at every table; Konnopke's sausages under the U2's viaduct; and
// down by the Spree a beach bar where people dance.
//
// The river is the block's west edge (local x = 0), so everything near it
// stays low. The amphitheatre opens towards the camera: the stage at the
// front, the tiers rising away behind it.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { altbauRow, dog, imbiss, liegestuhl, picnic, tags } from "../berlin";
import { uSign } from "../bridges";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, bike, cafeTable, person, randomLook, stall, tree, windowAt } from "../kit";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C, GRAFFITI } from "../palette";
import { BlockBuilder, BlockCtx, Mover } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** The water tower's yellow-brown brick. */
const TOWER: RGB = hex("#c9905e");

function stroll(c: BlockCtx, pts: V2[], r = 1.0): Route {
  return new Route(
    rounded(
      pts.map((p) => [c.ox + p[0], c.oy + p[1], c.oz] as V3),
      true,
      r,
    ),
    true,
  );
}

/** A string of bulbs from post to post: small yellow dots by day, light at night. */
function bulbs(pen: Pen, pts: V3[], sag = 0.5, z0 = 0): void {
  pen.begin();
  for (const p of pts) pen.pole([p[0], p[1], z0], p, 0.1, C.greyDark);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85));
    const wire: V3[] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      wire.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]);
    }
    pen.stroke(wire, { w: 0.04, kind: L_BAR, wobble: 0 });
    for (let k = 1; k < n; k++) {
      const p = wire[k];
      pen.stroke(
        [
          [p[0], p[1], p[2] - 0.1],
          [p[0], p[1], p[2] - 0.2],
        ],
        { w: 0.15, color: C.yellow, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [p[0], p[1], p[2] - 0.12],
          [p[0], p[1], p[2] - 0.2],
        ],
        { w: 0.36, kind: L_LIGHT, wobble: 0, alpha: 0.9 },
      );
    }
  }
  pen.end();
}

/** A pram, seen side on, pointing along local +x: the district has more of them than cars. */
function pram(pen: Pen, x: number, y: number, rot: number, col: RGB): void {
  pen.push(x, y, 0, rot);
  const p = pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true);
  pen.begin();
  for (const a of [-0.36, 0.36]) p.circle(a, 0.2, 0.2, null, { w: 0.06, seg: 8, wobble: 0 });
  p.poly(
    [
      [-0.56, 0.42],
      [0.52, 0.42],
      [0.62, 0.86],
      [-0.56, 0.86],
    ],
    col,
    { outline: true, w: W_FINE, layer: 1 },
  );
  const hood: V2[] = [[-0.56, 0.86]];
  for (let k = 0; k <= 6; k++) hood.push([-0.56 + 0.56 * (1 - Math.cos((k / 6) * Math.PI * 0.5)) + 0.0, 0.86 + 0.5 * Math.sin((k / 6) * Math.PI * 0.5)]);
  hood.push([0.0, 0.86]);
  p.poly(hood, scaleRGB(col, 0.82), { outline: true, w: W_FINE, layer: 2 });
  p.line(
    [
      [0.6, 0.8],
      [0.98, 1.22],
    ],
    { w: 0.06, kind: L_BAR, wobble: 0 },
  );
  pen.end();
  pen.pop();
}

/** A parent, a pram, and usually a coffee. */
function parent(pen: Pen, rng: Rng, x: number, y: number, rot: number): void {
  pram(pen, x, y, rot, rng.pick([C.blueDark, C.charcoal, C.red, C.teal, C.ochre, C.green]));
  const r = (rot * Math.PI) / 180;
  person(pen, x + Math.cos(r) * 1.25, y + Math.sin(r) * 1.25, 0, randomLook(rng), "stand", Math.cos(r) - Math.sin(r) > 0);
}

/** Someone pedalling a box bike full of children round a route. */
function cargoCyclist(route: Route, rng: Rng, born: number, speed: number, seed: number): Mover {
  const rider = randomLook(rng);
  const color = rng.pick([C.teal, C.red, C.blueDark]);
  const frames = [0, 1].map((f) => new Turning((pen) => bike(pen, { rider, color, frame: f, cargo: true }), 24, seed + f));
  const phase = rng.next() * 10;
  return traveler(route, { speed, at: rng.next(), born, span: 1.8, sprite: (h, t) => frames[Math.floor(t * 3 + phase) & 1].at(h) });
}

/** A bird, wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

/** Paint on every inch: big shapes in two colours, and tags over the lot. */
function sprayed(f: Plane, rng: Rng, a0: number, a1: number, b0: number, b1: number): void {
  const n = Math.max(2, Math.round((a1 - a0) / 2.3));
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * (a1 - a0)) / n + rng.range(0, 0.25);
    const ww = Math.min(rng.range(1.6, 2.4), a1 - a - 0.05);
    if (ww < 0.8) continue;
    const hh = (b1 - b0) * rng.range(0.7, 0.95);
    const pts: V2[] = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      pts.push([a + ww / 2 + Math.cos(t) * (ww / 2) * rng.range(0.85, 1.1), b0 + 0.1 + hh / 2 + Math.sin(t) * (hh / 2) * rng.range(0.85, 1.05)]);
    }
    f.poly(pts, rng.pick(GRAFFITI), { outline: true, w: 0.1, layer: 1, grain: 0.5 });
    const cx = a + ww / 2;
    const cy = b0 + 0.1 + hh / 2;
    f.poly(
      [
        [cx - ww * 0.28, cy - hh * 0.22],
        [cx + ww * 0.1, cy - hh * 0.3],
        [cx + ww * 0.3, cy + hh * 0.1],
        [cx - ww * 0.05, cy + hh * 0.3],
      ],
      rng.pick(GRAFFITI),
      { outline: true, w: 0.07, layer: 2, grain: 0.5 },
    );
  }
  tags(f, rng, a0, a1, b0, b1, Math.round((a1 - a0) * 0.9));
}

// ---------------------------------------------------------------- the amphitheatre

/** The middle of the stage. */
const AC: V2 = [33, 36.4];
/** The tiers face the camera: they run round the far side of the stage, from the south-west to the north-east. */
const T0 = (135 * Math.PI) / 180;
const T1 = (315 * Math.PI) / 180;
const R0 = 3.2;
const DEP = 1.05;
const TIERS = 6;
const RISE = 0.55;
const TOP = RISE * TIERS;
const ROUT = R0 + TIERS * DEP;

function ringPt(r: number, t: number): V2 {
  return [AC[0] + Math.cos(t) * r, AC[1] + Math.sin(t) * r];
}

function sector(r0: number, r1: number, t0: number, t1: number, n = 16): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) pts.push(ringPt(r1, t0 + ((t1 - t0) * i) / n));
  for (let i = n; i >= 0; i--) pts.push(ringPt(r0, t0 + ((t1 - t0) * i) / n));
  return pts;
}

// ---------------------------------------------------------------- the place

export const prenzlauerberg: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(25.5, 26, 1);

  // the wall along the crest, and the bank it holds up
  const WALL_Y = 25.0;
  const WALL_X0 = 22.2;
  const WALL_X1 = 35.2;
  const WALL_H = TOP + 2.6;

  // ---- the ground
  c.early(() => {
    const g = pen.floor(0, 1);
    // sand for the beach bar, grass north of it, the market's trodden ground
    g.rect(E + 0.1, 20.2, 12.9, B - E, C.sand, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(E + 0.3, 20.4, 12.7, B - E - 0.2, { n: 70, len: 0.3, ang: 0.3, jit: 1.5, color: C.sandstoneDark, w: 0.05 });
    g.rect(E + 0.1, E, 12.9, 13.4, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(E + 0.3, E + 0.2, 12.7, 13.2, { n: 34, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    g.rect(14.0, 13.6, B - E, B - E, C.plaza);
    pen.floor(0, 2).ticks(14.3, 13.9, B - E - 0.3, B - E - 0.3, { n: 150, len: 0.3, ang: -0.78, jit: 0.2, color: C.stoneDark, w: 0.06 });
  });

  // ---- the amphitheatre: six tiers of stone round the back of a round stage
  for (let k = 0; k < TIERS; k++) {
    pen.obj(
      () => pen.extrude(sector(R0 + k * DEP, R0 + (k + 1) * DEP, T0, T1), 0, RISE * (k + 1), C.stoneDark, { top: C.stone, crease: 30 }),
      0.06 * k,
    );
  }
  pen.obj(() => {
    pen.cyl(AC[0], AC[1], 0, 2.2, 0.35, C.stoneDark, { seg: 16, top: C.sandstoneLight });
  });
  // the bank behind the top tier, up to the wall: grass
  pen.obj(() => {
    const bank: V2[] = [
      [WALL_X0, WALL_Y + 0.2],
      [WALL_X1 + 1.0, WALL_Y + 0.2],
    ];
    const ta = (290 * Math.PI) / 180;
    const tb = (150 * Math.PI) / 180;
    for (let i = 0; i <= 16; i++) bank.push(ringPt(ROUT, ta + ((tb - ta) * i) / 16));
    bank.push([WALL_X0, ringPt(ROUT, tb)[1]]);
    pen.extrude(bank, 0, TOP, scaleRGB(C.grass, 0.8), { top: C.grass, crease: 30 });
    pen.floor(TOP, 1).ticks(WALL_X0 + 0.2, WALL_Y + 0.4, WALL_X1 + 0.8, 41, {
      n: 90,
      len: 0.42,
      ang: 0.9,
      jit: 0.5,
      color: C.grassDark,
      w: 0.06,
      inside: (a, b) => {
        const r = Math.hypot(a - AC[0], b - AC[1]);
        const t = Math.atan2(b - AC[1], a - AC[0]);
        const tt = t < 0 ? t + Math.PI * 2 : t;
        return r > ROUT + 0.3 && tt > tb && tt < ta;
      },
    });
  }, 0.3);
  // the old hinterland wall along the crest: not an inch of it bare
  pen.obj(() => {
    pen.box(WALL_X0, WALL_Y - 0.15, 0, WALL_X1 - WALL_X0, 0.3, WALL_H, C.concrete);
    pen.pole([WALL_X0, WALL_Y, WALL_H + 0.1], [WALL_X1, WALL_Y, WALL_H + 0.1], 0.4, C.concrete);
    const f = pen.wall("y+", WALL_X0, WALL_Y - 0.15, 0, WALL_X1 - WALL_X0, 0.3);
    sprayed(f, rng, 0.15, WALL_X1 - WALL_X0 - 0.15, TOP + 0.05, WALL_H - 0.1);
    const g = pen.wall("x+", WALL_X0, WALL_Y - 0.15, 0, WALL_X1 - WALL_X0, 0.3);
    g.rect(0, 0, 0.3, WALL_H, rng.pick(GRAFFITI), { layer: 1, grain: 0.5 });
  }, 0.4);
  // two at work on it, cans in hand
  for (const [x, fl] of [
    [25.4, false],
    [31.2, true],
  ] as [number, boolean][]) {
    person(pen, x, WALL_Y + 0.75, TOP, { ...randomLook(rng), hat: C.black }, "wave", fl);
    pen.obj(() => pen.box(x + (fl ? -0.5 : 0.5), WALL_Y + 0.6, TOP, 0.4, 0.3, 0.3, C.charcoal, { w: W_FINE }));
  }

  // the audience: every tier taken, a few already on their feet
  const wavers: { x: number; y: number; z: number; t: number; look: Look }[] = [];
  for (let k = 0; k < TIERS; k++) {
    const rs = R0 + k * DEP + 0.62;
    const z = RISE * (k + 1);
    const step = 0.98 / rs;
    let i = 0;
    for (let t = T0 + 0.07; t < T1 - 0.05; t += step, i++) {
      const p = ringPt(rs, t);
      // every sixth place on the upper tiers belongs to the wave
      if (k >= 2 && (i + k * 2) % 6 === 0 && wavers.length < 16) {
        wavers.push({ x: p[0], y: p[1], z, t, look: randomLook(rng) });
        continue;
      }
      if (rng.chance(0.3)) continue;
      const pose = rng.chance(0.07) ? "cheer" : rng.chance(0.06) ? "wave" : "bust";
      person(pen, p[0], p[1], z, randomLook(rng), pose, Math.cos(t) > 0, rng.chance(0.12) ? 0.72 : 1);
    }
  }
  // the wave: one after another round the bowl, twice while the camera is here
  const waveSprites = wavers.map((w, i) => ({
    ...w,
    down: makeSprite((p) => person(p, 0, 0, 0, w.look, "bust", Math.cos(w.t) > 0), 0, 100 + i),
    up: makeSprite((p) => person(p, 0, 0, 0, w.look, "cheer", Math.cos(w.t) > 0), 0, 130 + i),
  }));
  for (const w of waveSprites) {
    c.movers.push((m) => {
      const st = c.stay();
      const first = st ? st.at + 0.25 : c.done + 2;
      const again = st ? 1.25 : 5;
      // where the wave is, measured from its start, counting only two passes when there is a tour
      let u = m.t - first - ((w.t - T0) / (T1 - T0)) * 1.0;
      if (u > again * 0.5) u -= again;
      if (!st && u > 0) u = ((u + 0.5 * again) % again) - 0.5 * again;
      const upNow = Math.abs(u) < 0.26;
      m.put(upNow ? w.up : w.down, c.ox + w.x, c.oy + w.y, c.oz + w.z + (upNow ? 0.22 * (1 - Math.abs(u) / 0.26) : 0), c.done);
    });
  }

  // on the stage: whoever's turn it is, giving it everything
  const singerLook: Look = { ...randomLook(rng), top: C.red, hat: null };
  const singer = [
    makeSprite((p) => {
      person(p, 0, 0, 0, singerLook, "cheer", false);
      p.card(0.48, 0, 1.75).bar(0, 0, 0.12, 0.3, 0.1, C.black, { layer: 6 });
    }, 0, 81),
    makeSprite((p) => {
      person(p, 0, 0, 0, singerLook, "wave", false);
      p.card(0.5, 0, 1.6).bar(0, 0, 0.12, 0.3, 0.1, C.black, { layer: 6 });
    }, 0, 82),
  ];
  c.movers.push((m) => {
    m.put(singer[Math.floor(m.t * 2.6) & 1], c.ox + AC[0] - 0.2, c.oy + AC[1] - 0.1, c.oz + 0.35 + Math.abs(Math.sin(m.t * 5.2)) * 0.06, c.done);
  });
  // the notes that come off the stage, and fade
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(c.ox + AC[0], c.oy + AC[1], c.oz + 4, 12)) return;
    for (let k = 0; k < 5; k++) {
      const life = 2.6;
      const tt = m.t + k * 0.52;
      const gen = Math.floor(tt / life);
      const u = (tt - gen * life) / life;
      const side = ((gen * 7 + k * 3) % 5) / 4 - 0.5;
      const x = c.ox + AC[0] + 0.3 + u * (1.2 + side * 2.4);
      const y = c.oy + AC[1] - 0.3 + side * u * 1.6;
      const z = c.oz + 2.9 + u * 3.6 + Math.sin(u * 7 + k) * 0.15;
      const alpha = u < 0.15 ? u / 0.15 : u > 0.7 ? (1 - u) / 0.3 : 1;
      const cd = m.pen.card(x, y, z);
      const col = [C.redDark, C.blueDark, C.ink, C.purple, C.green][k];
      cd.seg(-0.14, 0, 0.14, 0.06, { w: 0.36, color: col, alpha, kind: L_MARK, wobble: 0 });
      cd.seg(0.2, 0.04, 0.2, 1.1, { w: 0.1, color: col, alpha, kind: L_MARK, wobble: 0 });
      cd.seg(0.2, 1.1, 0.62, 0.78, { w: 0.13, color: col, alpha, kind: L_MARK, wobble: 0 });
    }
  });
  // the karaoke man: a cargo bike of loudspeakers under a parasol, a laptop, a list of who is next
  const kx = AC[0] + 4.2;
  const ky = AC[1] - 1.9;
  pen.push(kx, ky, 0, 200);
  bike(pen, { cargo: true, rider: null, color: C.orange });
  pen.pop();
  pen.obj(() => {
    for (const o of [0, 0.8]) pen.box(kx + 0.5 + o, ky + 0.75, 0, 0.7, 0.6, 1.25, C.black, { w: W_THIN });
    pen.wall("y+", kx + 0.5, ky + 0.75, 0, 1.5, 0.6).circle(0.35, 0.7, 0.24, C.charcoal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
    pen.wall("y+", kx + 0.5, ky + 0.75, 0, 1.5, 0.6).circle(1.15, 0.7, 0.24, C.charcoal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
    pen.pole([kx - 0.2, ky + 0.4, 0], [kx - 0.2, ky + 0.4, 2.9], 0.08, C.white, { ink: false });
    pen.cone(kx - 0.2, ky + 0.4, 2.55, 1.35, 0.5, C.yellow, { seg: 8, crease: 0.5 });
  });
  person(pen, kx - 0.7, ky + 1.2, 0, { ...randomLook(rng), hat: C.orange }, "stand", true);
  // a few who would rather stand, down at the front
  for (const [x, y] of [
    [37.3, 41.6],
    [38.6, 40.4],
    [40.4, 41.9],
    [41.6, 39.6],
    [30.6, 42.4],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "cheer", "wave"]), false, rng.chance(0.2) ? 0.72 : 1);
  }
  parent(pen, rng, 39.6, 42.9, 200);
  dog(pen, 36.2, 42.6, 0, C.woodDark, false);

  // ---- the giant swings on the bank: out over the slope and back
  const swingLooks = [randomLook(rng), randomLook(rng)];
  [34.5, 37.9].forEach((sy, i) => {
    const sx = 23.0;
    const pz = TOP + 5.3;
    pen.obj(() => {
      for (const o of [-0.75, 0.75]) {
        pen.pole([sx - 1.5, sy + o, TOP], [sx, sy + o, pz], 0.16, C.woodDark);
        pen.pole([sx + 1.5, sy + o, TOP], [sx, sy + o, pz], 0.16, C.woodDark);
      }
      pen.pole([sx, sy - 0.85, pz], [sx, sy + 0.85, pz], 0.16, C.woodDark);
    }, 0.5);
    const rider = makeSprite((p) => {
      person(p, 0, 0, -0.35, swingLooks[i], "sit", i === 1, i === 1 ? 0.72 : 1);
      p.box(-0.35, -0.3, -0.06, 0.7, 0.6, 0.08, C.wood, { w: W_FINE });
    }, 0, 91 + i);
    const L = 4.3;
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const wx = c.ox + sx;
      const wy = c.oy + sy;
      if (!m.sees(wx, wy, c.oz + pz - 2, 12)) return;
      const a = 0.82 * Math.sin(m.t * 1.5 + i * 2.2);
      const x = wx + Math.sin(a) * L;
      const z = c.oz + pz - Math.cos(a) * L;
      for (const o of [-0.3, 0.3]) {
        m.pen.stroke(
          [
            [wx, wy + o, c.oz + pz],
            [x, wy + o, z],
          ],
          { w: 0.045, kind: L_BAR, wobble: 0 },
        );
      }
      m.put(rider, x, wy, z, c.done);
    });
  });
  tree(pen, rng, 23.2, 28.6, { kind: "round", z: TOP });
  tree(pen, rng, 23.4, 40.2, { kind: "round", z: TOP });

  // ---- the back: the water tower on its mound, and four restored tenements
  const wx = 18.0;
  const wy = 9.2;
  const wr = 3.5;
  const wh = 11;
  c.early(() => {
    pen.cyl(wx, wy, 0, 4.2, 0.5, scaleRGB(C.grass, 0.8), { seg: 18, top: C.grass });
  });
  pen.obj(() => {
    pen.cyl(wx, wy, 0.5, wr, wh, TOWER, { seg: 18 });
    // three rings of small windows: it has been flats for a long time
    for (let ring = 0; ring < 3; ring++) {
      for (const deg of [-28, 2, 32, 62, 92, 122]) {
        const t = (deg * Math.PI) / 180;
        const f = pen.plane([wx + Math.cos(t) * wr, wy + Math.sin(t) * wr, 0.5], [-Math.sin(t), Math.cos(t), 0], [0, 0, 1], 1);
        windowAt(f, -0.36, 1.6 + ring * 3.1, 0.36, 2.9 + ring * 3.1, rng.chance(0.6), C.cream);
        if (ring === 0 && deg === 62) f.rect(-0.5, 0, 0.5, 1.25, C.door, { outline: true, w: W_FINE });
      }
    }
    const cd = pen.card(wx, wy, 0.5);
    for (const b of [4.2, 7.3, 10.3]) cd.arc(0, b - 0.9, wr * 1.2247, wr * 0.7, Math.PI * 1.02, Math.PI * 1.98, { w: 0.07, color: scaleRGB(TOWER, 0.72), kind: L_MARK, wobble: 0.2, seg: 14 });
  });
  pen.obj(() => {
    pen.cyl(wx, wy, wh + 0.5, wr + 0.3, 0.4, C.sandstoneLight, { seg: 18 });
    pen.cone(wx, wy, wh + 0.9, wr + 0.45, 2.3, C.slate, { seg: 18 });
    pen.cyl(wx, wy, wh + 3.0, 0.5, 0.7, TOWER, { seg: 8 });
    pen.cone(wx, wy, wh + 3.7, 0.65, 0.8, C.slate, { seg: 8 });
  }, 0.2);

  pen.push(22.4, E + 0.6, 0);
  altbauRow(pen, rng, 4, { widths: [5.3], graffiti: 0.15, shops: ["cafe", "bakery", "flowers", "books"], end: "ivy" });
  pen.pop();
  // brunch on the pavement outside all of them, and prams parked at every table
  const front = E + 0.6 + 8;
  for (let k = 0; k < 6; k++) cafeTable(pen, rng, 23.6 + k * 3.4, front + 2.75 + (k % 2) * 0.3, k % 3 === 0 ? C.white : null, 3 + (k % 2));
  for (const [x, rot] of [
    [25.3, 80],
    [29.0, 250],
    [32.2, 100],
    [35.7, 260],
    [39.0, 95],
  ]) {
    pram(pen, x, front + 3.0, rot, rng.pick([C.blueDark, C.charcoal, C.red, C.teal]));
  }

  // ---- the playground at the tower's foot
  pen.obj(() => {
    pen.floor(0, 2).rect(14.9, 14.5, 18.3, 17.7, C.sand, { outline: true, w: W_THIN });
    for (const [x, y, w, d] of [
      [14.75, 14.35, 3.7, 0.2],
      [14.75, 17.65, 3.7, 0.2],
    ]) {
      pen.box(x, y, 0, w, d, 0.22, C.wood, { w: W_FINE });
    }
  });
  for (const [x, y] of [
    [15.6, 15.3],
    [16.9, 16.6],
    [17.6, 15.2],
  ]) {
    person(pen, x, y, -0.15, randomLook(rng), "sit", rng.chance(0.5), 0.72);
    pen.obj(() => pen.cyl(x + 0.5, y + 0.3, 0, 0.14, 0.24, rng.pick([C.red, C.yellow, C.blue]), { seg: 6 }));
  }
  // a climbing frame, and a slide
  pen.obj(() => {
    const fx = 19.3;
    const fy = 14.6;
    for (const [a, b] of [
      [0, 0],
      [1.8, 0],
      [1.8, 1.8],
      [0, 1.8],
    ]) {
      pen.pole([fx + a, fy + b, 0], [fx + a, fy + b, 2.4], 0.09, C.red);
    }
    for (const z of [1.2, 2.4]) {
      pen.stroke(
        [
          [fx, fy, z],
          [fx + 1.8, fy, z],
          [fx + 1.8, fy + 1.8, z],
          [fx, fy + 1.8, z],
          [fx, fy, z],
        ],
        { w: 0.08, color: C.yellow, kind: L_BAR, wobble: 0 },
      );
    }
    // the slide off its south side
    pen.fill(
      [
        [fx + 0.5, fy + 1.8, 2.3],
        [fx + 1.3, fy + 1.8, 2.3],
        [fx + 1.3, fy + 4.2, 0.1],
        [fx + 0.5, fy + 4.2, 0.1],
      ],
      C.zinc,
      { outline: true, w: W_FINE },
    );
  });
  person(pen, 20.2, 15.5, 2.4, randomLook(rng), "cheer", false, 0.72);
  person(pen, 20.2, 17.9, 0.95, randomLook(rng), "sit", false, 0.72);
  person(pen, 21.6, 18.4, 0, randomLook(rng), "stand", true);
  parent(pen, rng, 15.4, 18.6, 20);

  // ---- the flea market: a row across the middle and another down the west side
  const signs = ["FLOHMARKT", "VINYL", "LAMPEN", "BÜCHER"];
  const goods: RGB[][] = [
    [C.brickRose, C.ochre, C.teal, C.cream],
    [C.black, C.charcoal, C.red, C.black],
    [C.yellow, C.orange, C.white, C.pink],
    [C.brickBrown, C.blueDark, C.green, C.cream],
  ];
  for (let k = 0; k < 4; k++) {
    pen.push(23.0 + k * 3.35, 16.9, 0);
    stall(pen, rng, { w: 3.25, sign: signs[k], goods: goods[k], a: [C.orange, C.blue, C.red, C.green][k] });
    pen.pop();
  }
  for (let k = 0; k < 11; k++) {
    person(pen, 23.5 + k * 1.2 + rng.range(-0.3, 0.3), 19.45 + rng.range(0, 0.9), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
  parent(pen, rng, 30.2, 20.6, 170);
  const west = ["TRÖDEL", "KLEIDER", "KRAM"];
  west.forEach((sign, k) => {
    const y = 21.2 + k * 5.6;
    pen.push(14.4, y, 0);
    stall(pen, rng, { w: 3.4, sign, goods: [C.copper, C.gold, C.blue, C.wood, C.pink], a: [C.yellow, C.red, C.blue][k] });
    pen.pop();
    for (let q = 0; q < 3; q++) person(pen, 14.9 + q * 1.1 + rng.range(-0.2, 0.2), y + 2.6 + rng.range(0, 0.6), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
  });
  // a rail of old coats, a crate of records, a pile of lamps nobody wants
  pen.obj(() => {
    const ry = 38.6;
    pen.pole([14.5, ry, 0], [14.5, ry, 1.9], 0.07, C.greyDark);
    pen.pole([17.7, ry, 0], [17.7, ry, 1.9], 0.07, C.greyDark);
    pen.stroke(
      [
        [14.5, ry, 1.9],
        [17.7, ry, 1.9],
      ],
      { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    for (let k = 0; k < 7; k++) {
      const cd = pen.card(14.8 + k * 0.43, ry, 0.7);
      cd.rect(-0.2, 0, 0.2, 1.15, rng.pick([C.brickBrown, C.blueDark, C.green, C.ochre, C.charcoal, C.redDark]), { outline: true, w: W_FINE, sway: 0.15 });
    }
    pen.box(14.7, 40.3, 0, 1.0, 0.7, 0.45, C.wood, { w: W_FINE });
    for (let k = 0; k < 5; k++) pen.box(14.78 + k * 0.18, 40.36, 0.45, 0.12, 0.58, 0.3, rng.pick([C.black, C.red, C.cream, C.teal]), { edges: false });
    for (let k = 0; k < 3; k++) {
      pen.pole([16.4 + k * 0.5, 40.6, 0], [16.4 + k * 0.5, 40.6, 0.7 + k * 0.25], 0.06, C.greyDark);
      pen.cone(16.4 + k * 0.5, 40.6, 0.6 + k * 0.25, 0.26, 0.34, [C.yellow, C.orange, C.pink][k], { seg: 7 });
    }
  });
  person(pen, 16.0, 41.6, 0, randomLook(rng), "stand", false);

  // buskers on the strip between the stalls and the bank: a guitar, a set of buckets, a ring of listeners
  const bx = 20.7;
  const by = 22.6;
  const guitarist: Look = { ...randomLook(rng), hat: C.ochre };
  person(pen, bx, by, 0, guitarist, "stand", false);
  pen.obj(() => {
    const cd = pen.card(bx, by, 0);
    cd.ellipse(0.12, 1.02, 0.3, 0.22, C.wood, { outline: true, w: W_FINE, layer: 6, seg: 10 });
    cd.bar(0.3, 1.12, 0.92, 1.42, 0.09, C.woodDark, { layer: 6 });
  });
  person(pen, bx + 0.2, by + 1.3, -0.2, randomLook(rng), "sit", true);
  pen.obj(() => {
    for (const [o, col] of [
      [0.75, C.white],
      [1.05, C.orange],
      [0.55, C.blue],
    ] as [number, RGB][]) {
      pen.cyl(bx + o, by + 1.3 + (o > 0.9 ? 0.3 : -0.2), 0, 0.2, 0.42, col, { seg: 7 });
    }
  });
  for (let k = 0; k < 5; k++) {
    const a = 0.2 + (k / 4) * 1.9;
    person(pen, bx - 0.6 + Math.cos(a) * 2.0, by + 1.0 + Math.sin(a) * 1.9, 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), Math.cos(a) > 0, rng.chance(0.2) ? 0.72 : 1);
  }
  // the juggler, three balls up
  const jx = 20.6;
  const jy = 29.6;
  person(pen, jx, jy, 0, { ...randomLook(rng), top: C.purple, hat: C.yellow }, "cheer", false);
  person(pen, jx - 1.3, jy + 0.9, 0, randomLook(rng), "stand", false, 0.72);
  person(pen, jx - 0.9, jy + 1.6, 0, randomLook(rng), "cheer", false, 0.72);
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(c.ox + jx, c.oy + jy, c.oz + 3, 8)) return;
    for (let k = 0; k < 3; k++) {
      const u = (m.t * 0.95 + k / 3) % 1;
      const dir = Math.floor(m.t * 0.95 + k / 3) % 2 ? -1 : 1;
      const a = dir * (-0.55 + 1.1 * u);
      m.pen.card(c.ox + jx, c.oy + jy, c.oz + 2.0 + 1.9 * 4 * u * (1 - u)).circle(a, 0, 0.12, [C.red, C.yellow, C.sky][k], { seg: 7, grain: 0, outline: true, w: 0.04 });
    }
  });
  // the balloon seller
  const sx = 19.6;
  const sy = 34.2;
  person(pen, sx, sy, 0, randomLook(rng), "stand", false);
  pen.obj(() => {
    const cd = pen.card(sx + 0.42, sy, 1.2);
    const cols = [C.red, C.yellow, C.sky, C.pink, C.grassLight, C.orange, C.purple, C.white];
    cols.forEach((col, k) => {
      const a = -0.75 + (k % 4) * 0.5 + (k > 3 ? 0.25 : 0);
      const b = 2.3 + (k > 3 ? 0.75 : 0) + (k % 2) * 0.15;
      cd.seg(0, 0, a, b - 0.3, { w: 0.03, wobble: 0, sway: 0.2, swayB: 0.5 });
      cd.ellipse(a, b, 0.3, 0.37, col, { outline: true, w: W_FINE, layer: 1 + (k % 3), sway: 0.5, seg: 10 });
    });
  });
  person(pen, sx + 1.2, sy + 0.8, 0, randomLook(rng), "cheer", true, 0.72);

  // ---- the U2 on its viaduct, a train standing on it, and Konnopke's under the last bay
  const VX = 36.7;
  const VW = 4.6;
  const VY0 = 14.0;
  const VY1 = 23.5;
  const VZ = 4.7;
  pen.obj(() => {
    pen.box(VX, VY0, VZ, VW, VY1 - VY0, 0.8, C.steel, { top: C.ballast });
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, VX, VY0, VZ, VW, VY1 - VY0);
      const len = sd === "x+" ? VY1 - VY0 : VW;
      const bays = Math.round(len / 2.3);
      for (let k = 0; k < bays; k++) {
        f.seg((k * len) / bays, 0.08, ((k + 1) * len) / bays, 0.72, { w: 0.07, color: C.steelDark, kind: L_MARK, wobble: 0 });
        f.seg((k * len) / bays, 0.72, ((k + 1) * len) / bays, 0.08, { w: 0.07, color: C.steelDark, kind: L_MARK, wobble: 0 });
      }
    }
  });
  for (let k = 0; k <= 4; k++) {
    const y = VY0 + 0.35 + (k * (VY1 - VY0 - 0.7)) / 4;
    pen.obj(() => {
      for (const x of [VX + 0.25, VX + VW - 0.25]) {
        pen.box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.3, C.stoneDark, { w: W_FINE });
        pen.pole([x, y, 0.3], [x, y, VZ], 0.26, C.steel);
      }
      pen.stroke(
        [
          [VX + 0.25, y, VZ - 0.25],
          [VX + VW - 0.25, y, VZ - 0.25],
        ],
        { w: 0.16, color: C.steelDark, kind: L_BAR, wobble: 0 },
      );
    });
  }
  // the train: two short yellow cars
  for (let k = 0; k < 2; k++) {
    const y0 = VY0 + 0.4 + k * 4.5;
    pen.obj(() => {
      pen.box(VX + 1.2, y0 + 0.3, VZ + 0.8, 2.2, 3.6, 0.4, C.charcoal, { edges: false });
      pen.box(VX + 1.1, y0, VZ + 1.2, 2.4, 4.3, 2.15, C.bvg, { top: C.slateLight, w: 0.11 });
      const f = pen.wall("x+", VX + 1.1, y0, VZ + 1.2, 2.4, 4.3);
      for (const [a0, a1, door] of [
        [0.25, 1.0, false],
        [1.1, 1.75, true],
        [1.85, 2.45, false],
        [2.55, 3.2, true],
        [3.3, 4.05, false],
      ] as [number, number, boolean][]) {
        if (door) f.rect(a0, 0.12, a1, 1.9, C.bvgDark, { outline: true, w: W_FINE, layer: 1 });
        f.rect(a0 + (door ? 0.08 : 0), 0.95, a1 - (door ? 0.08 : 0), 1.8, C.glass, { outline: !door, w: W_FINE, layer: door ? 2 : 1, glow: 0.8 });
      }
      if (k === 1) {
        const g = pen.wall("y+", VX + 1.1, y0, VZ + 1.2, 2.4, 4.3);
        g.rect(0.25, 0.95, 2.15, 1.85, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.8 });
        g.rect(0.3, 0.3, 0.6, 0.55, C.lamp, { layer: 1, glow: 1 });
        g.rect(1.8, 0.3, 2.1, 0.55, C.lamp, { layer: 1, glow: 1 });
      }
    }, 0.25);
  }
  pen.push(VX + 0.6, 21.2, 0);
  imbiss(pen, rng, { sign: "KONNOPKE", queue: 0, board: C.red });
  pen.pop();
  // ten in the queue: straight out from the hatch, then round the corner
  for (let k = 0; k < 5; k++) person(pen, VX + 2.5 + rng.range(-0.1, 0.1), 24.9 + k * 0.8, 0, randomLook(rng), k === 0 ? "wave" : "stand", k % 2 === 0);
  for (let k = 0; k < 5; k++) person(pen, VX + 3.3 + k * 0.8, 28.9 + rng.range(-0.1, 0.1), 0, randomLook(rng), "stand", k % 2 === 1, rng.chance(0.15) ? 0.72 : 1);
  uSign(pen, 42.7, 24.4, 0);

  // ---- the beach bar by the river: sand, deckchairs, a hut, and tango on a wooden floor
  pen.obj(() => {
    pen.box(5.2, 14.4, 0, 3.8, 2.8, 2.5, C.wood, { top: C.sand });
    const f = pen.wall("y+", 5.2, 14.4, 0, 3.8, 2.8);
    f.rect(0.3, 1.0, 3.5, 2.0, C.charcoal, { outline: true, w: W_THIN, glow: 0.6, layer: 1 });
    f.block(0.2, 0.9, 3.6, 1.0, 0.4, C.woodDark, { w: W_FINE });
    const sg = pen.plane([5.1, 17.22, 2.5], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 4.0, 0.7, C.teal, { outline: true, w: W_FINE, glow: 0.4 });
    sg.text("STRANDBAR", 2.0, 0.18, 0.34, { align: "c", layer: 1, color: C.white, kind: L_MARK, w: 0.065 });
  });
  person(pen, 7.1, 16.9, 0.25, randomLook(rng), "bust", false);
  for (let k = 0; k < 3; k++) person(pen, 6.0 + k * 1.1, 18.2 + (k % 2) * 0.25, 0, randomLook(rng), "stand", k === 2);
  // a palm in a pot, because every beach bar in Berlin has one
  pen.obj(() => {
    pen.cyl(10.6, 18.6, 0, 0.5, 0.7, C.tile, { seg: 8 });
    pen.pole([10.6, 18.6, 0.7], [10.75, 18.6, 3.1], 0.2, C.trunk);
    const cd = pen.card(10.75, 18.6, 3.1);
    for (let k = 0; k < 7; k++) {
      const a = 0.25 + (k / 6) * (Math.PI - 0.5);
      cd.line(
        [
          [0, 0],
          [Math.cos(a) * 0.9, Math.sin(a) * 0.8 + 0.2],
          [Math.cos(a) * 1.6, Math.sin(a) * 0.5 - 0.35],
        ],
        { w: 0.17, color: k % 2 ? C.leafDark : C.hedge, kind: L_MARK, wobble: 0.3, sway: 0.3 },
      );
    }
  });
  for (let k = 0; k < 7; k++) {
    liegestuhl(pen, rng, 6.0 + (k % 2) * 2.4 + rng.range(-0.2, 0.2), 21.6 + k * 1.9, 180 + rng.range(-12, 12), undefined, k !== 3);
  }
  for (let k = 0; k < 2; k++) cafeTable(pen, rng, 11.2, 23.2 + k * 4.6, k ? C.red : C.yellow, 2 + k);
  picnic(pen, rng, 7.6, 8.4, 0, 3);
  picnic(pen, rng, 10.6, 11.2, 0, 2);
  tree(pen, rng, 5.6, 6.2, { kind: "bush" });
  tree(pen, rng, 11.6, 6.4, { kind: "bush" });
  // the dance floor
  const DX0 = 5.2;
  const DY0 = 36.6;
  const DW = 6.6;
  const DD = 6.2;
  pen.obj(() => {
    pen.box(DX0, DY0, 0, DW, DD, 0.14, C.wood, { top: C.wood, w: W_THIN });
    pen.floor(0.14, 1).ticks(DX0 + 0.1, DY0 + 0.1, DX0 + DW - 0.1, DY0 + DD - 0.1, { n: 22, len: 4, ang: 0, jit: 0.02, color: C.woodDark, w: 0.05 });
  });
  bulbs(
    pen,
    [
      [DX0, DY0, 3.3],
      [DX0 + DW, DY0, 3.3],
      [DX0 + DW, DY0 + DD, 3.3],
      [DX0, DY0 + DD, 3.3],
      [DX0, DY0, 3.3],
    ],
    0.45,
  );
  bulbs(
    pen,
    [
      [5.0, 20.6, 3.0],
      [12.6, 20.6, 3.0],
      [12.6, 34.6, 3.0],
    ],
    0.6,
  );
  // four couples, turning
  for (let k = 0; k < 4; k++) {
    const cx = DX0 + 1.7 + (k % 2) * 3.2;
    const cy = DY0 + 1.7 + Math.floor(k / 2) * 2.9;
    const looks = [
      { ...randomLook(rng), long: false },
      { ...randomLook(rng), long: true, top: rng.pick([C.red, C.black, C.purple, C.teal]) },
    ];
    const sp = looks.map((lk, i) => [makeSprite((p) => person(p, 0, 0, 0, lk, "walkA", i === 1), 0, 140 + k * 4 + i), makeSprite((p) => person(p, 0, 0, 0, lk, "walkB", i === 1), 0, 142 + k * 4 + i)]);
    const ph = k * 1.7;
    c.movers.push((m) => {
      const a = m.t * 0.85 * (k % 2 ? -1 : 1) + ph;
      const ox = c.ox + cx + Math.cos(m.t * 0.31 + ph) * 0.6;
      const oy = c.oy + cy + Math.sin(m.t * 0.27 + ph) * 0.5;
      const fr = Math.floor(m.t * 2.2 + ph) & 1;
      m.put(sp[0][fr], ox + Math.cos(a) * 0.34, oy + Math.sin(a) * 0.34, c.oz + 0.14, c.done);
      m.put(sp[1][fr], ox - Math.cos(a) * 0.34, oy - Math.sin(a) * 0.34, c.oz + 0.14, c.done);
    });
  }
  for (let k = 0; k < 4; k++) person(pen, 12.2 + rng.range(-0.3, 0.3), 37.4 + k * 1.5, 0, randomLook(rng), rng.pick(["stand", "wave"]), true);

  // bulbs over the flea market too
  bulbs(pen, [
    [22.9, 19.3, 3.2],
    [29.7, 19.3, 3.2],
    [36.4, 19.3, 3.2],
  ]);

  // ---- everything else that moves
  // along the front of the stalls
  const row = stroll(
    c,
    [
      [23.2, 20.75],
      [36.0, 20.75],
      [36.0, 21.75],
      [23.2, 21.75],
    ],
    0.45,
  );
  for (let k = 0; k < 4; k++) c.movers.push(walker(row, rng, c.done + rng.range(0, 1)));
  // down the west side between the stalls and the buskers
  const strip = stroll(
    c,
    [
      [18.4, 20.9],
      [19.4, 20.9],
      [19.4, 42.6],
      [18.4, 42.6],
    ],
    0.45,
  );
  for (let k = 0; k < 5; k++) c.movers.push(walker(strip, rng, c.done + rng.range(0, 1)));
  // box bikes full of children, round the playground
  const loop = stroll(
    c,
    [
      [14.05, 13.75],
      [22.3, 13.75],
      [22.3, 19.9],
      [14.05, 19.9],
    ],
    1.3,
  );
  for (let k = 0; k < 2; k++) c.movers.push(cargoCyclist(loop, rng, c.done + rng.range(0, 1), rng.range(2.6, 3.2), 300 + k * 10));
  // pigeons round the water tower
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 4; k++) {
    const r = 4.2 + k * 1.0;
    const sp = (0.5 + 0.08 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 6 + ph) & 1;
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + wx + Math.cos(a) * r, c.oy + wy + Math.sin(a) * r * 0.8, c.oz + 16.5 + Math.sin(m.t * 0.7 + ph) * 1.0, born);
    });
  }
};
