// The Arena on match day. The near stand is drawn low, as a cutaway, so the
// pitch shows: two teams and a ball in play, a wave going round the terraces,
// away fans in their yellow corner, and outside the last supporters streaming
// in past the chip stand.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { Look, Pose, W_FINE, W_THIN, bikeRow, flag, lamp, person, randomLook, stall, tree, tufts } from "../kit";
import { Route, castWalker, makeSprite, traveler, walker } from "../motion";
import { C, SHIRT, SKIN } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const SX = 20;
const SY = 18.6;
/** Segments round the bowl. */
const N = 48;
const TAU = Math.PI * 2;
const ang = (k: number) => (k / N) * TAU;
/** The upper tier and the roof run round the far side only: segments K0 to K1. */
const K0 = 16;
const K1 = 44;

const SEAT_R = hex("#d8463a");
const SEAT_W = hex("#f3efe6");
const CONC = hex("#d9d5cb");
const CONC_D = hex("#bdb8ad");
const ROOF = hex("#eef0f0");
const APRON = hex("#86b765");
const AWAY = hex("#f6cf3a");

interface Ring {
  ra: number;
  rb: number;
  z: number;
}

const LOW: Ring[] = [
  { ra: 10.2, rb: 7.2, z: 0.6 },
  { ra: 10.75, rb: 7.75, z: 1.1 },
  { ra: 11.3, rb: 8.3, z: 1.6 },
  { ra: 11.85, rb: 8.85, z: 2.1 },
  { ra: 12.4, rb: 9.4, z: 2.6 },
];
const UP: Ring[] = [
  { ra: 12.6, rb: 9.6, z: 3.3 },
  { ra: 13.15, rb: 10.15, z: 4.1 },
  { ra: 13.7, rb: 10.7, z: 4.9 },
  { ra: 14.25, rb: 11.25, z: 5.7 },
  { ra: 14.8, rb: 11.8, z: 6.5 },
];

const at = (r: Ring, t: number, dz = 0): V3 => [SX + Math.cos(t) * r.ra, SY + Math.sin(t) * r.rb, r.z + dz];
const ell = (ra: number, rb: number, t: number, z: number): V3 => [SX + Math.cos(t) * ra, SY + Math.sin(t) * rb, z];
/** How squarely the stand at angle t faces the camera: 1 at the far corner, -1 at the near one. */
const facing = (t: number) => Math.cos(t - (225 * Math.PI) / 180);

// ---------------------------------------------------------------- ground

/** How far inside the island's edge a point is: below 1 is on the island. */
function onIsland(x: number, y: number): number {
  return Math.pow(Math.abs(x - 20) / 19.3, 3.2) + Math.pow(Math.abs(y - 18.6) / 17.7, 3.2);
}

function ground(c: BlockCtx): void {
  const { pen } = c;
  // a soft-cornered patch of grass
  const blob: V2[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * TAU;
    const k = 1 + 0.03 * Math.sin(3 * t + 0.7) + 0.02 * Math.sin(5 * t + 2.1) + 0.01 * Math.sin(11 * t);
    const q = Math.pow(Math.pow(Math.abs(Math.cos(t)), 3.2) + Math.pow(Math.abs(Math.sin(t)), 3.2), -1 / 3.2);
    blob.push([20 + Math.cos(t) * 19.5 * q * k, 18.6 + Math.sin(t) * 17.9 * q * k]);
  }
  pen.floor(0.01, 0).poly(blob, C.grass, { outline: true, w: 0.09, ink: C.grassDark, wobble: 1.4 });
  const onPlaza = (a: number, b: number, pad: number) => {
    const px = (a - SX) / (17.2 + pad);
    const py = (b - SY - 1.6) / (15.6 + pad);
    return px * px + py * py < 1;
  };
  tufts(pen.floor(0.01, 1), 1, 1, 39, 36.5, 0.2, (a, b) => onIsland(a, b) < 0.92 && !onPlaza(a, b, 0.3));
  // the concourse round the ground, and the way in from the city
  const p = pen.floor(0.01, 1);
  p.ellipse(SX, SY + 1.6, 17.2, 15.6, C.plaza, { seg: 44, outline: true, w: 0.07, ink: C.streetDark });
  p.poly(
    [
      [0.9, 17.4],
      [4.0, 17.6],
      [4.0, 21.8],
      [0.9, 21.6],
    ],
    C.plaza,
  );
  p.ticks(3, 3, 37, 35.5, {
    n: 190,
    len: 0.3,
    ang: -0.78,
    jit: 0.2,
    color: C.streetDark,
    w: 0.06,
    inside: (a, b) => {
      const qx = (a - SX) / 13.3;
      const qy = (b - SY) / 10.3;
      return onPlaza(a, b, -0.5) && qx * qx + qy * qy > 1;
    },
  });
}

// ---------------------------------------------------------------- the pitch

function strokeGlyph(f: Plane, pts: number[], a: number, b: number, k: number, color: RGB, w: number, kind: number, layer: number): void {
  const out: V2[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push([a + pts[i] * k, b + pts[i + 1] * k]);
  f.line(out, { w, color, kind, wobble: 0.3, layer });
}

function pitch(c: BlockCtx): void {
  const { pen } = c;
  const x0 = SX - 7.5;
  const x1 = SX + 7.5;
  const y0 = SY - 4.8;
  const y1 = SY + 4.8;
  c.early(() => {
    pen.floor(0.03, 1).ellipse(SX, SY, 10.2, 7.2, APRON, { seg: 44 });
    const g = pen.floor(0.03, 2);
    for (let i = 0; i < 10; i++) g.rect(x0 + i * 1.5, y0, x0 + (i + 1) * 1.5, y1, i % 2 ? C.grass : C.grassLight, { grain: 0.7 });
    const l = pen.floor(0.03, 3);
    const o = { w: 0.075, color: C.white, kind: L_MARK, wobble: 0.3 };
    l.loop(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      o,
    );
    l.seg(SX, y0, SX, y1, o);
    l.arc(SX, SY, 1.5, 1.5, 0, TAU, { ...o, seg: 20 });
    for (const s of [-1, 1]) {
      const gx = SX + s * 7.5;
      l.line(
        [
          [gx, SY - 2.9],
          [gx - s * 2.4, SY - 2.9],
          [gx - s * 2.4, SY + 2.9],
          [gx, SY + 2.9],
        ],
        o,
      );
      l.line(
        [
          [gx, SY - 1.3],
          [gx - s * 0.85, SY - 1.3],
          [gx - s * 0.85, SY + 1.3],
          [gx, SY + 1.3],
        ],
        o,
      );
      l.arc(gx - s * 1.7, SY, 1.35, 1.35, s > 0 ? Math.PI * 0.68 : -Math.PI * 0.32, s > 0 ? Math.PI * 1.32 : Math.PI * 0.32, { ...o, seg: 8 });
    }
  });
  // goals
  for (const s of [-1, 1]) {
    pen.obj(() => {
      const gx = SX + s * 7.5;
      for (const y of [SY - 0.95, SY + 0.95]) {
        pen.stroke(
          [
            [gx, y, 0.03],
            [gx, y, 0.82],
          ],
          { w: 0.09, color: C.white, kind: L_BAR, wobble: 0 },
        );
        pen.stroke(
          [
            [gx, y, 0.82],
            [gx + s * 0.75, y, 0.05],
          ],
          { w: 0.04, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.9 },
        );
      }
      pen.stroke(
        [
          [gx, SY - 0.95, 0.82],
          [gx, SY + 0.95, 0.82],
        ],
        { w: 0.09, color: C.white, kind: L_BAR, wobble: 0 },
      );
      for (let i = 1; i < 5; i++) {
        const y = SY - 0.95 + i * 0.38;
        pen.stroke(
          [
            [gx, y, 0.82],
            [gx + s * 0.75, y, 0.05],
          ],
          { w: 0.03, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.8 },
        );
      }
      pen.stroke(
        [
          [gx + s * 0.75, SY - 0.95, 0.05],
          [gx + s * 0.75, SY + 0.95, 0.05],
        ],
        { w: 0.04, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.9 },
      );
    });
  }
  // corner flags
  pen.obj(() => {
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]) {
      pen.stroke(
        [
          [x, y, 0.03],
          [x, y, 0.75],
        ],
        { w: 0.05, color: C.white, kind: L_BAR, wobble: 0 },
      );
      pen.card(x, y, 0.5).poly(
        [
          [0, 0],
          [0.3, 0.12],
          [0, 0.25],
        ],
        C.yellow,
        { grain: 0, sway: 0.15 },
      );
    }
  });
  // the benches, and two managers who cannot sit down
  for (const s of [-1, 1]) {
    pen.obj(() => {
      const x = SX + s * 2.6 - 1.1;
      pen.box(x, SY - 6.3, 0.03, 2.2, 0.7, 0.75, C.glassPale, { top: C.white, w: W_FINE, grain: 0.4 });
      const lk = randomLook(new Rng(s > 0 ? 3 : 4));
      lk.top = s > 0 ? C.black : hex("#27456b");
      lk.legs = C.black;
      person(pen, SX + s * 2.6, SY - 5.2, 0.03, lk, s > 0 ? "wave" : "stand", s < 0, 0.6);
    });
  }
}

// ---------------------------------------------------------------- the stands

function fanColour(rng: Rng, away: boolean): RGB {
  if (away) return rng.chance(0.8) ? AWAY : hex("#2f6fb7");
  const r = rng.next();
  return r < 0.4 ? C.red : r < 0.7 ? C.white : r < 0.8 ? C.orange : rng.pick(SHIRT);
}

/** One spectator: a dot of shirt and a dot of head. */
function spectator(pen: Pen, p: V3, shirt: RGB, skin: RGB): void {
  pen.stroke(
    [
      [p[0], p[1], p[2] + 0.1],
      [p[0], p[1], p[2] + 0.36],
    ],
    { w: 0.3, color: shirt, kind: L_BAR, wobble: 0 },
  );
  pen.stroke(
    [
      [p[0], p[1], p[2] + 0.56],
      [p[0], p[1], p[2] + 0.58],
    ],
    { w: 0.23, color: skin, kind: L_BAR, wobble: 0 },
  );
}

function tier(c: BlockCtx, rings: Ring[], k0: number, k1: number): void {
  const { pen, rng } = c;
  const rows = rings.length - 1;
  for (let s = k0; s < k1; s += 4) {
    pen.obj(() => {
      const sect = Math.floor(s / 4);
      const away = sect === 5;
      for (let k = s; k < Math.min(k1, s + 4); k++) {
        const t0 = ang(k);
        const t1 = ang(k + 1);
        const f = 0.84 + 0.16 * Math.max(0, facing((t0 + t1) / 2));
        for (let r = 0; r < rows; r++) {
          const col = (sect + (r >> 1)) % 2 ? SEAT_R : SEAT_W;
          pen.fill([at(rings[r], t0), at(rings[r], t1), at(rings[r + 1], t1), at(rings[r + 1], t0)], scaleRGB(col, f), { grain: 0.5 });
        }
      }
      // the gangway down the edge of each block
      pen.stroke([at(rings[0], ang(s), 0.02), at(rings[rows], ang(s), 0.02)], { w: 0.13, color: CONC, kind: L_MARK, wobble: 0.2 });
      // the crowd
      for (let k = s; k < Math.min(k1, s + 4); k++) {
        const tm = ang(k + 0.5);
        if (facing(tm) < -0.32) continue;
        for (let r = 0; r < rows; r++) {
          const ra = (rings[r].ra + rings[r + 1].ra) / 2;
          const rb = (rings[r].rb + rings[r + 1].rb) / 2;
          const z = (rings[r].z + rings[r + 1].z) / 2;
          const arc = (TAU / N) * Math.hypot(ra * Math.sin(tm), rb * Math.cos(tm));
          const n = Math.max(2, Math.round(arc / 0.52));
          for (let i = 0; i < n; i++) {
            if (rng.chance(0.07)) continue;
            const t = ang(k + (i + 0.5) / n);
            if (Math.abs(t - ang(s)) < 0.012) continue;
            spectator(pen, ell(ra, rb, t, z), fanColour(rng, away), rng.pick(SKIN));
          }
        }
      }
    });
  }
  // the steps between rows
  pen.obj(() => {
    const full = k1 - k0 === N;
    for (let r = 0; r <= rows; r++) {
      const pts: V3[] = [];
      for (let k = k0; k <= k1 - (full ? 1 : 0); k++) pts.push(at(rings[r], ang(k), 0.01));
      const edge = r === 0 || r === rows;
      pen.stroke(pts, { w: edge ? 0.1 : 0.045, color: edge ? undefined : C.inkSoft, kind: edge ? 0 : L_MARK, wobble: 0.25, closed: full });
    }
  });
}

function stands(c: BlockCtx): void {
  const { pen, rng } = c;
  const adCols = [C.blue, C.white, C.yellow, C.red, C.white, C.green, C.white, C.orange];

  // advertising boards along the far touchline
  pen.obj(() => {
    for (let k = 0; k < N; k++) {
      const t0 = ang(k);
      const t1 = ang(k + 1);
      if (facing((t0 + t1) / 2) < 0.05) continue;
      pen.fill([ell(10.2, 7.2, t0, 0.04), ell(10.2, 7.2, t1, 0.04), ell(10.2, 7.2, t1, 0.6), ell(10.2, 7.2, t0, 0.6)], adCols[k % adCols.length], { grain: 0.4 });
    }
  });
  tier(c, LOW, 0, N);

  // the front of the upper tier: more boards
  pen.obj(() => {
    const top: V3[] = [];
    const bot: V3[] = [];
    for (let k = K0; k < K1; k++) {
      const t0 = ang(k);
      const t1 = ang(k + 1);
      pen.fill([at(LOW[4], t0), at(LOW[4], t1), at(UP[0], t1), at(UP[0], t0)], k % 3 === 0 ? C.red : C.white, { grain: 0.4 });
    }
    for (let k = K0; k <= K1; k++) {
      top.push(at(UP[0], ang(k), 0.01));
      bot.push(at(LOW[4], ang(k), 0.01));
    }
    pen.stroke(top, { w: 0.09, wobble: 0.25 });
    pen.stroke(bot, { w: 0.07, wobble: 0.25 });
  });
  tier(c, UP, K0, K1);

  // ---- the near wall: low, so the pitch shows over it, with its gates and heads along the top
  pen.obj(() => {
    const foot: V2[] = [];
    for (let k = K1; k <= N + K0; k++) foot.push([SX + Math.cos(ang(k)) * 12.75, SY + Math.sin(ang(k)) * 9.75]);
    for (let k = N + K0; k >= K1; k--) foot.push([SX + Math.cos(ang(k)) * 12.4, SY + Math.sin(ang(k)) * 9.4]);
    pen.extrude(foot, 0, 2.95, CONC, { crease: 30, top: C.stone });
    const band: V3[] = [];
    for (let k = K1; k <= N + K0; k++) band.push(ell(12.78, 9.78, ang(k), 2.35));
    pen.stroke(band, { w: 0.34, color: C.red, kind: L_MARK, wobble: 0.2 });
    for (let k = K1 + 1; k < N + K0; k += 2) {
      if (facing(ang(k)) > -0.2) continue;
      const p = ell(12.8, 9.8, ang(k), 0);
      pen.stroke(
        [
          [p[0], p[1], 0.35],
          [p[0], p[1], 1.25],
        ],
        { w: 0.78, color: C.charcoal, kind: L_BAR, wobble: 0 },
      );
    }
  });
  pen.obj(() => {
    for (let k = K1; k < N + K0; k++) {
      for (let i = 0; i < 3; i++) {
        if (rng.chance(0.12)) continue;
        spectator(pen, ell(12.05, 9.05, ang(k + (i + 0.5) / 3), 2.6), fanColour(rng, false), rng.pick(SKIN));
      }
    }
  }, 0.2);

  // ---- the far wall, the ends of the upper tier, and the roof
  pen.obj(() => {
    const foot: V2[] = [];
    for (let k = K0; k <= K1; k++) foot.push([SX + Math.cos(ang(k)) * 15.15, SY + Math.sin(ang(k)) * 12.15]);
    for (let k = K1; k >= K0; k--) foot.push([SX + Math.cos(ang(k)) * 14.8, SY + Math.sin(ang(k)) * 11.8]);
    pen.extrude(foot, 0, 7.0, CONC, { crease: 30, top: C.stone });
  });
  for (const k of [K0, K1]) {
    pen.obj(() => {
      const t = ang(k);
      const q = (rho: number, z: number): V3 => ell(12.4 + rho, 9.4 + rho, t, z);
      pen.fill([q(0, 0), q(2.75, 0), q(2.75, 7.0), q(2.4, 7.0), q(2.4, 6.5), q(0.2, 3.3), q(0, 2.6)], CONC_D, { outline: true, w: 0.1, grain: 0.7 });
      // a stairwell door and a banner
      pen.stroke([q(1.5, 0.3), q(1.5, 1.4)], { w: 0.7, color: C.charcoal, kind: L_BAR, wobble: 0, bias: 0.1 });
      pen.fill([q(0.9, 3.9), q(2.1, 3.9), q(2.1, 6.1), q(0.9, 4.6)], C.red, { layer: 2, grain: 0.5, outline: true, w: W_FINE });
    }, 0.15);
  }
  pen.obj(() => {
    // roof: a pale canopy over the upper tier, on columns
    const inner: V3[] = [];
    const outer: V3[] = [];
    for (let k = K0; k < K1; k++) {
      const t0 = ang(k);
      const t1 = ang(k + 1);
      pen.fill([ell(12.2, 9.2, t0, 7.8), ell(12.2, 9.2, t1, 7.8), ell(15.3, 12.3, t1, 8.6), ell(15.3, 12.3, t0, 8.6)], k % 2 ? ROOF : scaleRGB(ROOF, 0.95), { grain: 0.5 });
      pen.stroke([ell(12.2, 9.2, t0, 7.81), ell(15.3, 12.3, t0, 8.61)], { w: 0.05, color: C.metal, kind: L_MARK, wobble: 0.2 });
    }
    for (let k = K0; k <= K1; k++) {
      inner.push(ell(12.2, 9.2, ang(k), 7.81));
      outer.push(ell(15.3, 12.3, ang(k), 8.61));
    }
    pen.stroke(inner, { w: 0.11, wobble: 0.25 });
    pen.stroke(outer, { w: 0.11, wobble: 0.25 });
    pen.stroke([inner[0], outer[0]], { w: 0.11, wobble: 0.2 });
    pen.stroke([inner[inner.length - 1], outer[outer.length - 1]], { w: 0.11, wobble: 0.2 });
    for (let k = K0; k <= K1; k += 2) {
      const p = ell(15.0, 12.0, ang(k), 7.0);
      pen.stroke([p, [p[0], p[1], 8.5]], { w: 0.12, color: CONC_D, kind: L_BAR, wobble: 0 });
    }
    // floodlights under the roof edge
    for (let k = K0; k < K1; k++) {
      const p = ell(12.25, 9.25, ang(k + 0.5), 7.62);
      pen.stroke(
        [
          [p[0], p[1] - 0.02, p[2]],
          [p[0], p[1] + 0.02, p[2]],
        ],
        { w: 0.2, color: C.lamp, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [p[0], p[1] - 0.02, p[2]],
          [p[0], p[1] + 0.02, p[2]],
        ],
        { w: 0.5, kind: L_LIGHT, wobble: 0, alpha: 0.85 },
      );
    }
  }, 0.3);

  // ---- big flags on poles among the home support
  pen.obj(() => {
    // red, white, red: the club's colours
    [17.5, 22.5, 27.5, 31.5, 34.5, 38.5, 42.5].forEach((k, i) => {
      const upper = i % 2 === 0;
      const r = upper ? UP[2] : LOW[2];
      const p = at(r, ang(k), 0.2);
      pen.stroke([p, [p[0], p[1], p[2] + 1.9]], { w: 0.05, color: C.white, kind: L_BAR, wobble: 0 });
      const k2 = pen.card(p[0], p[1], p[2] + 1.15);
      k2.rect(0.03, 0, 1.25, 0.75, C.red, { outline: true, w: 0.045, sway: 0.45, grain: 0.4 });
      k2.rect(0.03, 0.25, 1.25, 0.5, C.white, { sway: 0.45, grain: 0.3, layer: 1 });
    });
  }, 0.25);

  // ---- two scoreboards
  const score = (f: Plane) => {
    // drawn twice: once in paint for the day, once in light for the evening
    for (const kind of [L_MARK, L_LIGHT]) {
      const layer = kind === L_LIGHT ? 2 : 1;
      f.text("AMS", 0.4, 0.75, 0.62, { color: C.white, w: 0.09, layer, kind });
      f.text("RTM", 3.55, 0.75, 0.62, { color: C.white, w: 0.09, layer, kind });
      strokeGlyph(f, [0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 0, 0, 4, 0], 2.25, 0.72, 0.11, C.yellow, 0.1, kind, layer);
      f.seg(2.78, 1.05, 2.92, 1.05, { w: 0.09, color: C.yellow, kind, wobble: 0, layer });
      strokeGlyph(f, [1, 4.6, 2.2, 6, 2.2, 0], 3.0, 0.72, 0.11, C.yellow, 0.1, kind, layer);
    }
    f.seg(0.3, 0.42, 5.3, 0.42, { w: 0.05, color: C.red, kind: L_MARK, wobble: 0, layer: 1 });
  };
  pen.obj(() => {
    pen.box(SX - 12.55, SY - 2.8, 5.0, 0.3, 5.6, 1.9, C.charcoal, { w: W_THIN });
    const f = pen.wall("x+", SX - 12.55, SY - 2.8, 5.0, 0.3, 5.6);
    f.rect(0.15, 0.15, 5.45, 1.75, C.black, { glow: 0.25, grain: 0.3 });
    score(f);
  }, 0.4);
  pen.obj(() => {
    pen.box(SX - 2.8, SY - 9.6, 5.0, 5.6, 0.3, 1.9, C.charcoal, { w: W_THIN });
    const f = pen.wall("y+", SX - 2.8, SY - 9.6, 5.0, 5.6, 0.3);
    f.rect(0.15, 0.15, 5.45, 1.75, C.black, { glow: 0.25, grain: 0.3 });
    score(f);
  }, 0.4);

  // ---- the great arch the roof hangs from (its twin on the near side is left out with the rest of the cutaway)
  for (const y of [SY - 12.7]) {
    pen.obj(() => {
      const n = 16;
      const half = 14.6;
      const zz = (x: number) => 13.2 * (1 - Math.pow((x - SX) / half, 2));
      for (let i = 0; i < n; i++) {
        const xa = SX - half + (i / n) * half * 2;
        const xb = SX - half + ((i + 1) / n) * half * 2;
        pen.pole([xa, y, zz(xa)], [xb, y, zz(xb)], 0.4, C.white);
      }
      for (const x of [SX - half, SX + half]) pen.box(x - 0.5, y - 0.5, 0, 1, 1, 0.5, CONC, { w: W_THIN });
      if (y < SY) {
        for (let i = 2; i < n - 1; i += 1) {
          const x = SX - half + (i / n) * half * 2;
          const ta = Math.acos(Math.max(-1, Math.min(1, (x - SX) / 15.3)));
          pen.stroke(
            [
              [x, y, zz(x)],
              [x, SY - Math.sin(ta) * 12.3, 8.62],
            ],
            { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 },
          );
        }
      }
    }, 0.5);
  }
}

// ---------------------------------------------------------------- outside the ground

function fanLook(rng: Rng): Look {
  const lk = randomLook(rng);
  const r = rng.next();
  lk.top = r < 0.45 ? C.red : r < 0.8 ? C.white : lk.top;
  if (rng.chance(0.3)) lk.hat = C.red;
  return lk;
}

function outside(c: BlockCtx): void {
  const { pen, rng } = c;
  // trees round the edge of the island
  for (const [x, y] of [
    [3.2, 12.2],
    [5.4, 8.2],
    [9.5, 4.9],
    [30.5, 4.6],
    [35.2, 8.0],
    [37.6, 13.4],
    [38.0, 25.4],
    [36.0, 31.2],
    [3.0, 26.5],
    [5.6, 31.6],
    [10.5, 36.3],
    [31.0, 36.0],
  ]) {
    tree(pen, rng, x, y, { kind: rng.pick(["round", "round", "tall"]) });
  }
  // the fan shop and the chip stand
  pen.push(7.6, 29.6, 0);
  stall(pen, rng, { w: 3.6, d: 2.0, a: C.red, sign: "FANSHOP", goods: [C.red, C.white, C.red] });
  pen.pop();
  pen.push(11.9, 30.9, 0);
  stall(pen, rng, { w: 3.2, d: 2.0, a: C.yellow, sign: "PATAT", goods: [C.yellow, C.gold, C.wood] });
  pen.pop();
  for (let i = 0; i < 5; i++) {
    pen.obj(() => {
      const x = 12.2 + i * 0.72;
      const y = 33.9 + (i % 2) * 0.3;
      const lk = fanLook(rng);
      person(pen, x, y, 0, lk, i === 0 ? "wave" : "stand", i % 2 === 0, rng.chance(0.2) ? 0.7 : 1);
      if (i === 0) {
        // the first in the queue has his chips
        const k = pen.card(x, y, 0);
        k.poly(
          [
            [0.5, 1.75],
            [0.78, 1.75],
            [0.64, 1.35],
          ],
          C.white,
          { outline: true, w: 0.04, layer: 5, grain: 0 },
        );
        k.rect(0.52, 1.75, 0.76, 1.92, C.yellow, { layer: 5, grain: 0 });
      }
    });
  }
  // the team bus
  pen.obj(() => {
    const x = 17.2;
    const y = 32.5;
    pen.box(x, y, 0.3, 7.6, 2.2, 2.3, C.red, { top: C.white });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, x, y, 0.3, 7.6, 2.2);
      const w = side === "y+" ? 7.6 : 2.2;
      f.rect(0, 0.75, w, 1.0, C.white, { grain: 0.4 });
      if (side === "y+") {
        for (let i = 0; i < 6; i++) f.rect(0.45 + i * 1.15, 1.2, 1.4 + i * 1.15, 2.05, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.7 });
        f.rect(7.0, 0.1, 7.45, 2.05, C.glass, { outline: true, w: W_FINE, layer: 1 });
      } else {
        f.rect(0.2, 1.1, 2.0, 2.1, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.7 });
        f.rect(0.2, 0.25, 0.5, 0.5, C.lamp, { layer: 1, glow: 1, grain: 0 });
        f.rect(1.7, 0.25, 2.0, 0.5, C.lamp, { layer: 1, glow: 1, grain: 0 });
      }
    }
    for (const dx of [1.3, 6.2]) {
      pen.plane([x + dx, y + 2.22, 0], [1, 0, 0], [0, 0, 1], 0, true).circle(0, 0.42, 0.42, C.charcoal, { outline: true, w: W_FINE, seg: 10 });
    }
  });
  // the bronze of the local hero, mid-turn
  pen.obj(() => {
    pen.box(26.2, 30.6, 0, 1.2, 1.2, 0.9, C.quayCap, { w: W_THIN });
    const bz = hex("#7d6a4a");
    person(pen, 26.8, 31.2, 0.9, { skin: bz, hair: bz, top: bz, legs: bz, long: false, hat: null }, "walkA", false, 0.95);
    pen.card(26.8, 31.2, 0.9).circle(0.42, 0.16, 0.16, bz, { outline: true, w: 0.04, seg: 8, layer: 5 });
  });
  // bikes: half the crowd came on one
  bikeRow(pen, rng, 30.6, 30.6, 6, 0);
  bikeRow(pen, rng, 33.6, 27.6, 5, 0);
  bikeRow(pen, rng, 5.6, 26.0, 5, 0);
  // flags and lights
  flag(pen, 7.6, 22.6, 0, 6.5, "red", 1.1);
  flag(pen, 10.6, 28.6, 0, 6.5, "amsterdam", 1.1);
  flag(pen, 29.4, 30.4, 0, 6.5, "red", 1.1);
  flag(pen, 34.6, 24.6, 0, 6.5, "amsterdam", 1.1);
  for (const [x, y] of [
    [5.2, 23.8],
    [12.4, 30.2],
    [20.4, 32.6],
    [30.2, 32.2],
    [35.6, 20.6],
    [2.2, 19.2],
  ]) {
    lamp(pen, x, y, 0, 3.4);
  }
  // floodlight masts at the two near corners
  for (const [x, y] of [
    [4.4, 30.2],
    [35.0, 6.6],
  ]) {
    pen.obj(() => {
      pen.pole([x, y, 0], [x, y, 10.5], 0.22, C.metal);
      const k = pen.card(x, y, 10.2);
      k.rect(-1.0, 0, 1.0, 1.3, C.charcoal, { outline: true, w: W_FINE, layer: 1 });
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) {
          k.circle(-0.72 + i * 0.48, 0.36 + j * 0.56, 0.17, C.lamp, { layer: 2, seg: 7, glow: 1, grain: 0 });
        }
      }
      k.seg(-0.01, 0.65, 0.01, 0.65, { kind: L_LIGHT, w: 2.6, alpha: 0.2, wobble: 0, layer: 3 });
    });
  }
  // supporters standing about, some with scarves held high
  const spots: V2[] = [];
  let guard = 0;
  while (spots.length < 34 && guard++ < 2000) {
    const t = rng.range(-0.75, 2.35);
    const r = rng.range(1.12, 1.3);
    const x = SX + Math.cos(t) * 12.9 * r;
    const y = SY + Math.sin(t) * 9.9 * r;
    if (y > 29.4 && x > 7 && x < 26) continue;
    if (spots.some((p) => Math.hypot(p[0] - x, p[1] - y) < 0.85)) continue;
    spots.push([x, y]);
  }
  for (const [x, y] of spots) {
    const lk = fanLook(rng);
    const pose: Pose = rng.pick(["stand", "stand", "wave", "cheer"]);
    pen.obj(() => {
      person(pen, x, y, 0, lk, pose, rng.chance(0.5), rng.chance(0.14) ? 0.7 : 1);
      if (pose === "cheer") {
        // a scarf stretched between two fists
        const k = pen.card(x, y, 0);
        for (let i = 0; i < 5; i++) k.rect(-0.6 + i * 0.24, 1.86, -0.36 + i * 0.24, 2.06, i % 2 ? C.white : C.red, { layer: 5, grain: 0 });
        k.loop(
          [
            [-0.6, 1.86],
            [0.6, 1.86],
            [0.6, 2.06],
            [-0.6, 2.06],
          ],
          { w: 0.04, layer: 6 },
        );
      }
    });
  }
}

// ---------------------------------------------------------------- the match, the wave, the crowd outside

interface Kicker {
  hx: number;
  hy: number;
  team: number;
  ph: number;
}

function motion(c: BlockCtx): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;

  // ---- the ball: a fixed passage of play that ends in a goal, then starts again
  // each step: where the ball goes (relative to the centre spot), how long it takes, how high it flies
  const play: [number, number, number, number][] = [
    [-7.0, 0.0, 0.7, 0],
    [-5.0, 1.1, 1.2, 0],
    [-2.2, -1.2, 1.2, 0],
    [-1.6, 3.4, 1.3, 0.5],
    [2.6, 2.0, 1.4, 1.3],
    [5.6, 0.6, 1.3, 0],
    [8.1, 0.25, 0.45, 0.35],
    [8.1, 0.25, 1.9, 0],
    [0.0, 0.0, 0.05, 0],
    [0.0, 0.0, 0.9, 0],
    [1.6, -3.4, 1.2, 0],
    [-1.8, -1.6, 1.3, 0.4],
    [-4.6, -3.2, 1.2, 0],
    [-7.0, 0.0, 1.5, 0.9],
  ];
  let total = 0;
  for (const p of play) total += p[2];
  const GOAL_AT = play.slice(0, 7).reduce((s, p) => s + p[2], 0);
  /** Match time: the passage of play is slid along so the goal goes in half a second after the camera arrives. */
  const matchTime = (t: number): number => {
    const at = c.visit();
    return at == null ? t : t - (at + 0.5 - GOAL_AT);
  };
  const ballAt = (t: number, out: V3): void => {
    let u = ((t % total) + total) % total;
    let px = play[play.length - 1][0];
    let py = play[play.length - 1][1];
    for (const [x, y, d, h] of play) {
      if (u <= d) {
        const e = d > 0.01 ? u / d : 1;
        const s = e * e * (3 - 2 * e);
        out[0] = px + (x - px) * s;
        out[1] = py + (y - py) * s;
        out[2] = 0.14 + Math.sin(e * Math.PI) * h;
        return;
      }
      u -= d;
      px = x;
      py = y;
    }
    out[0] = px;
    out[1] = py;
    out[2] = 0.14;
  };

  const squad: Kicker[] = [];
  const shape: V2[] = [
    [-7.0, 0],
    [-4.6, 3.2],
    [-4.6, -3.2],
    [-5.0, 1.1],
    [-5.0, -1.1],
    [-1.6, 3.4],
    [-1.6, -3.4],
    [-2.2, 1.2],
    [-2.2, -1.2],
    [1.8, 1.6],
    [1.8, -1.6],
  ];
  const kr = new Rng(404);
  for (const [x, y] of shape) squad.push({ hx: x, hy: y, team: 0, ph: kr.range(0, 6.28) });
  for (const [x, y] of shape) squad.push({ hx: -x, hy: -y, team: 1, ph: kr.range(0, 6.28) });

  const kit = (top: RGB, legs: RGB, seed: number) => castWalker({ skin: SKIN[seed % SKIN.length], hair: C.black, top, legs, long: false, hat: null }, seed, 0.56);
  const home = [kit(C.white, C.red, 1), kit(C.white, C.red, 2), kit(C.white, C.red, 3)];
  const away = [kit(AWAY, hex("#2f6fb7"), 4), kit(AWAY, hex("#2f6fb7"), 5), kit(AWAY, hex("#2f6fb7"), 6)];
  const keepers = [kit(C.green, C.black, 7), kit(C.orange, C.black, 8)];
  const referee = kit(C.black, C.black, 9);
  const joy = [0, 1, 2].map((i) => makeSprite((p) => person(p, 0, 0, 0, { skin: SKIN[(i + 1) % SKIN.length], hair: C.black, top: C.white, legs: C.red, long: false, hat: null }, "cheer", false, 0.56), 0, 60 + i));
  const ball = makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.13, C.white, { outline: true, w: 0.04, seg: 8, grain: 0 }), 0, 66);

  const b: V3 = [0, 0, 0];
  const b2: V3 = [0, 0, 0];
  const where = (k: Kicker, t: number, out: V2): void => {
    ballAt(t, b2);
    const dx = b2[0] - k.hx;
    const dy = b2[1] - k.hy;
    const d = Math.hypot(dx, dy);
    // everyone leans towards the ball, the nearest most of all
    const pull = Math.max(0.12, 0.92 - d / 4.2);
    out[0] = k.hx + dx * pull + Math.sin(t * 0.7 + k.ph) * 0.35;
    out[1] = k.hy + dy * pull + Math.cos(t * 0.55 + k.ph * 1.7) * 0.3;
    // keepers stay at home
    if (Math.abs(k.hx) > 6.5) {
      out[0] = k.hx + Math.sign(-k.hx) * 0.2;
      out[1] = Math.max(-1, Math.min(1, b2[1] * 0.5));
    }
  };
  const p0: V2 = [0, 0];
  const p1: V2 = [0, 0];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + SX, c.oy + SY, c.oz, 14)) return;
    const mt = matchTime(m.t);
    const u = ((mt % total) + total) % total;
    const scored = u > GOAL_AT && u < GOAL_AT + 1.9;
    ballAt(mt, b);
    // the ball is put back on the spot by sketching it in again
    const sinceKick = u - (GOAL_AT + 1.95);
    if (!(u > GOAL_AT + 1.9 && sinceKick <= 0)) {
      m.put(ball, c.ox + SX + b[0], c.oy + SY + b[1], c.oz + b[2] + 0.05, sinceKick > 0 && sinceKick < 1.2 ? m.t - sinceKick : born);
    }
    squad.forEach((k, i) => {
      where(k, mt, p0);
      where(k, mt + 0.12, p1);
      const right = p1[0] - p1[1] >= p0[0] - p0[1];
      const moving = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.012;
      const keeper = Math.abs(k.hx) > 6.5;
      const set = keeper ? keepers[k.team] : (k.team === 0 ? home : away)[i % 3];
      let s: Sprite = set.frames[right ? 0 : 1][moving ? Math.floor(m.t * 5 + i) & 1 : 1];
      let z = 0.03;
      if (scored && k.team === 0 && !keeper) {
        s = joy[i % 3];
        z += Math.abs(Math.sin(m.t * 7 + i)) * 0.3;
      }
      m.put(s, c.ox + SX + p0[0], c.oy + SY + p0[1], c.oz + z, born);
    });
    // the referee keeps up
    const rx = b[0] * 0.75 - 1.2;
    const ry = b[1] * 0.6 + 1.6;
    m.put(referee.frames[0][Math.floor(m.t * 4) & 1], c.ox + SX + rx, c.oy + SY + ry, c.oz + 0.03, born);
  });

  // ---- the wave: arms go up as it passes, round and round
  const armsUp = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.seg(-0.12, 0.45, -0.26, 0.86, { w: 0.09, color: C.white, kind: L_BAR, wobble: 0 });
      k.seg(0.12, 0.45, 0.26, 0.86, { w: 0.09, color: C.white, kind: L_BAR, wobble: 0 });
    },
    0,
    88,
  );
  const marks: { t: number; p: V3 }[] = [];
  const addRows = (rings: Ring[], k0: number, k1: number) => {
    for (let r = 0; r < rings.length - 1; r++) {
      const ra = (rings[r].ra + rings[r + 1].ra) / 2;
      const rb = (rings[r].rb + rings[r + 1].rb) / 2;
      const z = (rings[r].z + rings[r + 1].z) / 2;
      for (let k = k0; k < k1; k++) {
        for (let i = 0; i < 2; i++) {
          const t = ang(k + (i + 0.5) / 2);
          if (facing(t) < -0.32) continue;
          marks.push({ t, p: W(SX + Math.cos(t) * ra, SY + Math.sin(t) * rb, z) });
        }
      }
    }
  };
  addRows(LOW, 0, N);
  addRows(UP, K0, K1);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + SX, c.oy + SY, c.oz + 3, 16)) return;
    const mt = matchTime(m.t);
    const u = ((mt % total) + total) % total;
    const roar = u > GOAL_AT && u < GOAL_AT + 1.9;
    const head = m.t * 0.75;
    for (const k of marks) {
      let d = (k.t - head) % TAU;
      if (d < -Math.PI) d += TAU;
      if (d > Math.PI) d -= TAU;
      // when the goal goes in, the home end is on its feet all at once
      const lift = roar && Math.floor(((k.t / TAU) * N) / 4) !== 5 ? 0.5 + 0.5 * Math.abs(Math.sin(m.t * 6 + k.t * 9)) : Math.exp(-(d * d) / 0.035);
      if (lift < 0.2) continue;
      m.put(armsUp, k.p[0], k.p[1], k.p[2] + lift * 0.3, born);
    }
  });

  // ---- supporters on their way in, and round the ground looking for their gate
  const fr = new Rng(505);
  const fans = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => castWalker(fanLook(fr), 700 + i, i === 3 ? 0.7 : 1.001));
  const ring = (ra: number, rb: number, rev: boolean): Route => {
    const pts: V3[] = [];
    for (let i = 0; i < 40; i++) {
      const t = ((rev ? -i : i) / 40) * TAU;
      pts.push(W(SX + Math.cos(t) * ra, SY + 0.3 + Math.sin(t) * rb));
    }
    return new Route(pts, true);
  };
  const r1 = ring(15.3, 12.1, false);
  const r2 = ring(16.0, 12.8, true);
  for (let i = 0; i < 7; i++) c.movers.push(walker(r1, rng, born + rng.range(0, 1), undefined, fans[i % fans.length]));
  for (let i = 0; i < 6; i++) c.movers.push(walker(r2, rng, born + rng.range(0, 1), undefined, fans[(i + 3) % fans.length]));
  const way: V3[] = [W(1.6, 19.0), W(4.6, 24.8), W(9.4, 28.6), W(16.4, 31.6), W(25.2, 31.9), W(29.6, 29.9), W(29.9, 30.5), W(25.4, 32.5), W(16.2, 32.2), W(9.0, 29.2), W(4.1, 25.2), W(1.1, 19.6)];
  const wr = new Route(way, true);
  for (let i = 0; i < 9; i++) {
    c.movers.push(
      traveler(wr, {
        speed: rng.range(1.2, 1.7),
        at: rng.next(),
        born: born + rng.range(0, 1),
        span: 0.8,
        sprite: (h, t) => fans[i % fans.length].frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6 + i) & 1],
      }),
    );
  }
}

export const arena: BlockBuilder = (c) => {
  c.early(() => ground(c));
  pitch(c);
  stands(c);
  outside(c);
  motion(c);
  c.focus(20, 20, 1.15);
};
