// Schloss Charlottenburg: the summer palace Sophie Charlotte had built, long
// and yellow along the back of the block, its domed tower in the middle with
// Fortuna turning on top, and in front of it the baroque garden: four
// parterres of clipped box round a great fountain, orange trees in tubs,
// pleached limes down the sides, a carp pond with swans and, in the corner,
// the Belvedere. (In the real one the garden lies behind the palace; here it
// is the garden front we look at.) A string quartet plays on the terrace, and
// as the camera arrives the fountain rises to its full height.
//
// South is local +y, so everything faces the camera across the garden. The
// garden is symmetrical about the line x = MX.

import { RGB, Rng, V2, V3, mixRGB, scaleRGB } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { flagOf, swan } from "../berlin";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, archWindow, bench, bridge, lamp, person, randomLook, windowAt } from "../kit";
import { Route, makeSprite, rounded, traveler, walker } from "../motion";
import { C, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** The garden's axis. */
const MX = 24;
/** The great fountain, where the two walks cross, and the round space left for it. */
const FY = 27.9;
const FR = 4.6;
/** How high the terrace (and the palace's floor) stands above the garden. */
const TERR = 0.5;
/** The terrace's front edge, and where the steps down from it end. */
const TY1 = 17.2;
/** Eaves of the middle of the palace and of its wings. */
const H_MID = 8.5;
const H_WING = 6.5;

const GRAVEL: RGB = [222, 170, 138];
const BOX: RGB = [70, 128, 70];
const MARBLE: RGB = [240, 238, 230];

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

/** A plane on one flat side of a prism centred (cx, cy): the side between corner angles a0 and a1, from z up. */
function side(pen: Pen, cx: number, cy: number, z: number, r: number, a0: number, a1: number): { f: Plane; w: number } {
  const p0: V3 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z];
  const dx = Math.cos(a1) * r - Math.cos(a0) * r;
  const dy = Math.sin(a1) * r - Math.sin(a0) * r;
  const w = Math.hypot(dx, dy);
  return { f: pen.plane(p0, [dx / w, dy / w, 0], [0, 0, 1], 1), w };
}

// ---------------------------------------------------------------- the palace

/**
 * One range of the palace: two storeys of yellow plaster on a stone plinth,
 * tall windows, white pilasters, a white cornice. (x0, y0) is its far corner
 * and its front is on +y.
 */
function range(c: BlockCtx, x0: number, y0: number, w: number, d: number, h: number, bays: number, o: { arched?: boolean; lit?: number; every?: number; endWall?: boolean } = {}): void {
  const { pen, rng } = c;
  const lit = o.lit ?? 0.7;
  pen.box(x0, y0, 0, w, d, h, C.palace);
  const dress = (f: Plane, len: number, n: number) => {
    f.rect(0, 0, len, TERR, C.stone, { grain: 0.5 });
    f.rect(0, h - 0.45, len, h, C.white, { grain: 0.4, layer: 1 });
    f.seg(0, h - 0.45, len, h - 0.45, { w: 0.05, layer: 2 });
    const fh = (h - TERR - 0.45) / 2;
    f.rect(0, TERR + fh - 0.1, len, TERR + fh + 0.08, C.white, { grain: 0.4, layer: 1 });
    const bw = len / n;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * bw;
      const ww = Math.min(0.48, bw * 0.3);
      for (let i = 0; i < 2; i++) {
        const b0 = TERR + i * fh + (i ? 0.32 : 0.2);
        const b1 = b0 + fh * 0.7;
        if (o.arched && i === 0) archWindow(f, a - ww, b0, a + ww, b1 + 0.15, rng.chance(lit), C.white);
        else windowAt(f, a - ww, b0, a + ww, b1, rng.chance(lit), C.white);
      }
      if (k > 0 && k % (o.every ?? 2) === 0) f.rect(k * bw - 0.13, TERR, k * bw + 0.13, h - 0.45, C.white, { grain: 0.4, layer: 1 });
    }
    f.rect(0, TERR, 0.26, h - 0.45, C.white, { grain: 0.4, layer: 1 });
    f.rect(len - 0.26, TERR, len, h - 0.45, C.white, { grain: 0.4, layer: 1 });
  };
  dress(pen.wall("y+", x0, y0, 0, w, d), w, bays);
  if (o.endWall) dress(pen.wall("x+", x0, y0, 0, w, d), d, Math.max(2, Math.round(d / 1.9)));
}

/** A grey slate roof over a range, hipped, with a row of little dormers on the garden side. */
function slates(c: BlockCtx, x0: number, y0: number, w: number, d: number, h: number, dormers: number): void {
  const { pen, rng } = c;
  pen.hip(x0 - 0.2, y0 - 0.2, h, w + 0.4, d + 0.4, 2.1, C.slateLight, { inset: Math.min(w, d) * 0.42 });
  for (let k = 0; k < dormers; k++) {
    const a = x0 + ((k + 0.5) * w) / dormers;
    pen.box(a - 0.38, y0 + d - 1.5, h + 0.35, 0.76, 1.0, 0.8, C.palace, { top: C.slateLight, w: W_FINE });
    pen.wall("y+", a - 0.38, y0 + d - 1.5, h + 0.35, 0.76, 1.0).rect(0.16, 0.14, 0.6, 0.66, C.glass, { glow: rng.chance(0.5) ? 1 : 0, grain: 0.4 });
  }
}

/** Fortuna, gilded, balancing on a ball with her veil for a sail: the weathervane on top of the dome. */
function fortuna(pen: Pen, x: number, y: number, z: number): void {
  const cd = pen.card(x, y, z);
  const g = C.gold;
  const o = { outline: true, w: W_FINE, glow: 0.12 };
  cd.circle(0, 0.32, 0.32, g, { ...o, seg: 10 });
  // the veil, bellying out behind her
  cd.poly(
    [
      [-0.1, 2.5],
      [-0.95, 2.2],
      [-1.15, 1.45],
      [-0.5, 1.2],
      [-0.2, 1.7],
    ],
    [196, 146, 40],
    { ...o, layer: 1 },
  );
  cd.bar(0.02, 0.62, -0.08, 1.2, 0.17, g, { layer: 2 });
  cd.bar(0.05, 1.15, 0.5, 0.78, 0.14, g, { layer: 2 });
  cd.poly(
    [
      [-0.26, 1.15],
      [0.22, 1.15],
      [0.2, 1.95],
      [-0.2, 1.95],
    ],
    g,
    { ...o, layer: 3 },
  );
  cd.circle(0, 2.18, 0.22, g, { ...o, layer: 4, seg: 8 });
  cd.bar(-0.2, 1.85, -0.2, 2.55, 0.1, g, { layer: 4 });
  cd.bar(0.2, 1.85, 0.62, 2.3, 0.1, g, { layer: 4 });
}

/** The tower over the middle of the palace: a square base, an octagonal drum of tall windows, the copper dome, a lantern, and Fortuna. */
function tower(c: BlockCtx, x: number, y: number): void {
  const { pen } = c;
  const z0 = H_MID;
  pen.obj(() => {
    pen.box(x - 2.5, y - 2.5, z0, 5.0, 5.0, 2.5, C.palace);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, x - 2.5, y - 2.5, z0, 5.0, 5.0);
      f.rect(0, 2.1, 5.0, 2.5, C.white, { grain: 0.4, layer: 1 });
      f.rect(0, 0, 0.3, 2.1, C.white, { grain: 0.4, layer: 1 });
      f.rect(4.7, 0, 5.0, 2.1, C.white, { grain: 0.4, layer: 1 });
      f.circle(2.5, 1.15, 0.62, C.glass, { outline: true, w: W_FINE, seg: 12, glow: 0.8, layer: 1 });
    }
  }, 0.28);
  // the drum
  const z1 = z0 + 2.5;
  const r = 2.35;
  const oct: V2[] = [];
  for (let k = 0; k < 8; k++) oct.push([x + Math.cos(Math.PI / 8 + (k * Math.PI) / 4) * r, y + Math.sin(Math.PI / 8 + (k * Math.PI) / 4) * r]);
  pen.obj(() => {
    pen.extrude(oct, z1, z1 + 4.4, C.palace, { crease: 30 });
    for (const k of [-1, 0, 1]) {
      const a0 = Math.PI / 8 + (k * Math.PI) / 4;
      const { f, w } = side(pen, x, y, z1, r, a0, a0 + Math.PI / 4);
      archWindow(f, w / 2 - 0.42, 0.55, w / 2 + 0.42, 3.5, true, C.white);
      f.rect(0, 0, 0.16, 4.4, C.white, { grain: 0.4 });
      f.rect(w - 0.16, 0, w, 4.4, C.white, { grain: 0.4 });
      f.rect(0, 3.95, w, 4.4, C.white, { grain: 0.4 });
    }
    pen.cyl(x, y, z1 + 4.4, 2.65, 0.32, C.white, { seg: 16 });
  }, 0.4);
  // the dome, ribbed, long since green
  const z2 = z1 + 4.72;
  pen.obj(() => {
    pen.dome(x, y, z2, 2.5, 4.0, C.copper, { seg: 14, rings: 5 });
    for (let k = 0; k < 6; k++) {
      const a = -0.55 + k * 0.5;
      const rib: V3[] = [];
      for (let q = 0; q <= 6; q++) {
        const ph = (q / 6) * Math.PI * 0.5;
        rib.push([x + Math.cos(a) * Math.cos(ph) * 2.52, y + Math.sin(a) * Math.cos(ph) * 2.52, z2 + Math.sin(ph) * 4.02]);
      }
      pen.stroke(rib, { w: 0.1, color: C.copperDark, kind: L_MARK, wobble: 0.2 });
    }
    // floodlights, for the night
    for (const s of [-1, 1]) {
      pen.stroke(
        [
          [x + s * 2.4, y - s * 2.4 + 1.2, z1 + 0.4],
          [x + s * 1.2, y - s * 1.2 + 0.6, z2 + 3.4],
        ],
        { w: 2.2, kind: L_LIGHT, wobble: 0, alpha: 0.28 },
      );
    }
  }, 0.55);
  pen.obj(() => {
    pen.cyl(x, y, z2 + 3.95, 0.62, 1.5, C.white, { seg: 8 });
    for (const a of [0, 0.78, 1.57]) {
      pen.stroke(
        [
          [x + Math.cos(a) * 0.64, y + Math.sin(a) * 0.64, z2 + 4.25],
          [x + Math.cos(a) * 0.64, y + Math.sin(a) * 0.64, z2 + 5.15],
        ],
        { w: 0.2, color: C.glass, kind: L_MARK, wobble: 0 },
      );
    }
    pen.dome(x, y, z2 + 5.45, 0.75, 0.75, C.copper, { seg: 10, rings: 3 });
  }, 0.7);
  pen.obj(() => fortuna(pen, x, y, z2 + 6.15), 0.84);
}

/** The whole palace: the middle with its pediment and tower, the two wings, the Orangery at the east end. */
function palace(c: BlockCtx): void {
  const { pen, rng } = c;
  const y0 = E + 0.6;
  // the wings first, then the middle standing forward of them
  pen.obj(() => range(c, E + 0.4, y0 + 0.6, 13.2, 6.0, H_WING, 8, { every: 2 }));
  pen.obj(() => slates(c, E + 0.4, y0 + 0.6, 13.2, 6.0, H_WING, 5), 0.16);
  pen.obj(() => range(c, 30, y0 + 0.6, 6.2, 6.0, H_WING, 4, { every: 2 }));
  pen.obj(() => slates(c, 30, y0 + 0.6, 6.2, 6.0, H_WING, 2), 0.16);
  pen.obj(() => {
    range(c, 18, y0, 12, 7.4, H_MID, 7, { arched: true, every: 7, lit: 0.85 });
    // the centre stands a little proud: four giant pilasters under a pediment, the great door between
    const f = pen.wall("y+", 18, y0, 0, 12, 7.4);
    f.block(3.4, 0, 8.6, H_MID, 0.5, C.palace, { w: W_THIN });
    const g = pen.wall("y+", 18, y0, 0, 12, 7.9);
    g.rect(3.4, 0, 8.6, TERR, C.stone, { grain: 0.5 });
    for (const a of [3.55, 4.95, 6.75, 8.15]) g.rect(a, TERR, a + 0.34, H_MID - 0.45, C.white, { grain: 0.4, layer: 1 });
    g.rect(3.4, H_MID - 0.45, 8.6, H_MID, C.white, { grain: 0.4, layer: 1 });
    archWindow(g, 5.45, TERR, 6.55, 3.6, true, C.white);
    g.rect(5.6, TERR, 6.4, 2.7, C.door, { outline: true, w: W_FINE, layer: 2 });
    windowAt(g, 4.05, 1.0, 4.75, 3.2, true, C.white);
    windowAt(g, 7.25, 1.0, 7.95, 3.2, true, C.white);
    for (const a of [4.05, 5.65, 7.25]) windowAt(g, a, 4.7, a + 0.7, 7.2, true, C.white);
  }, 0.08);
  pen.obj(() => {
    slates(c, 18, y0, 12, 7.4, H_MID, 0);
    pen.gable(21.3, y0 + 2.0, H_MID, 5.4, 5.95, 1.7, "y", C.slateLight, { gable: C.white });
    const p = pen.wall("y+", 21.3, y0 + 2.0, H_MID, 5.4, 5.95);
    p.circle(2.7, 0.62, 0.36, C.gold, { outline: true, w: W_FINE, seg: 10, layer: 1 });
  }, 0.2);
  tower(c, MX, y0 + 3.4);
  // the Orangery: lower, all tall glass doors, urns along its roof
  pen.obj(() => {
    const x0 = 36.6;
    const w = B - E - 0.4 - x0;
    const h = 4.9;
    pen.box(x0, y0 + 0.9, 0, w, 5.4, h, C.palace, { top: C.stone });
    const f = pen.wall("y+", x0, y0 + 0.9, 0, w, 5.4);
    f.rect(0, 0, w, TERR, C.stone, { grain: 0.5 });
    f.rect(0, h - 0.4, w, h, C.white, { grain: 0.4, layer: 1 });
    const n = 4;
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.5) * w) / n;
      archWindow(f, a - 0.52, TERR, a + 0.52, h - 0.75, rng.chance(0.7), C.white);
      if (k > 0) f.rect((k * w) / n - 0.11, TERR, (k * w) / n + 0.11, h - 0.4, C.white, { grain: 0.4, layer: 1 });
    }
    const g = pen.wall("x+", x0, y0 + 0.9, 0, w, 5.4);
    g.rect(0, 0, 5.4, TERR, C.stone, { grain: 0.5 });
    for (const a of [1.4, 4.0]) archWindow(g, a - 0.5, TERR, a + 0.5, h - 0.75, true, C.white);
    for (let k = 0; k <= n; k++) {
      const cd = pen.card(x0 + (k * (w - 0.5)) / n + 0.25, y0 + 6.1, h);
      cd.poly(
        [
          [-0.1, 0],
          [0.1, 0],
          [0.24, 0.42],
          [0.12, 0.62],
          [-0.12, 0.62],
          [-0.24, 0.42],
        ],
        MARBLE,
        { outline: true, w: W_FINE },
      );
    }
  }, 0.1);
  flagOf(pen, 18.8, y0 + 6.6, H_MID + 0.3, 3.2, "berlin", 0.85);
  flagOf(pen, 28.6, y0 + 6.6, H_MID + 0.3, 3.2, "de", 0.85);
}

// ---------------------------------------------------------------- the garden's furniture

/** A lime clipped into a cube on a stem: the walls of a baroque garden are grown, not built. */
function pleached(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.pole([x, y, 0], [x, y, 1.75], 0.2, C.trunk);
  pen.box(x - 0.85, y - 0.85, 1.7, 1.7, 1.7, 1.5, C.leaf2, { top: C.leaf, w: 0.09 });
  for (const sd of ["x+", "y+"] as const) pen.wall(sd, x - 0.85, y - 0.85, 1.7, 1.7, 1.7).ticks(0.15, 0.15, 1.55, 1.35, { n: 7, len: 0.4, ang: 0.9, jit: 0.6, color: scaleRGB(C.leaf2, 0.8), w: 0.06 });
  pen.end();
}

/** A yew clipped to a cone. */
function yew(pen: Pen, x: number, y: number, h = 1.7): void {
  pen.begin();
  pen.pole([x, y, 0], [x, y, 0.4], 0.14, C.trunk, { ink: false });
  pen.cone(x, y, 0.3, 0.55, h, C.leafDark, { seg: 8 });
  pen.end();
}

/** An orange tree in a white tub, out for the summer. */
function orangeTree(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.begin();
  pen.box(x - 0.32, y - 0.32, 0, 0.64, 0.64, 0.55, C.white, { w: W_FINE });
  pen.pole([x, y, 0.55], [x, y, 1.35], 0.11, C.trunk, { ink: false });
  const cd = pen.card(x, y, 1.25);
  cd.circle(0, 0.55, 0.56, C.hedge, { outline: true, w: W_FINE, seg: 12, sway: 0.1 });
  for (let k = 0; k < 5; k++) cd.circle(rng.range(-0.34, 0.34), 0.55 + rng.range(-0.34, 0.34), 0.085, C.orange, { seg: 5, layer: 1, grain: 0, sway: 0.1 });
  pen.end();
}

/** A marble figure on a plinth: a goddess, a season, somebody's idea of a river. */
function figure(pen: Pen, x: number, y: number, flip = false): void {
  pen.begin();
  pen.box(x - 0.34, y - 0.34, 0, 0.68, 0.68, 1.15, C.sandstoneLight, { w: W_THIN });
  const cd = pen.card(x, y, 1.15, flip);
  cd.poly(
    [
      [-0.3, 0],
      [0.3, 0],
      [0.2, 1.0],
      [-0.2, 1.0],
    ],
    MARBLE,
    { outline: true, w: W_FINE, layer: 1 },
  );
  cd.circle(0, 1.22, 0.22, MARBLE, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  cd.bar(0.2, 0.9, 0.55, 1.4, 0.12, MARBLE, { layer: 2 });
  pen.end();
}

/** A low stone balustrade from (x0, y) to (x1, y), or down a side if `alongY`. */
function balustrade(pen: Pen, x0: number, y0: number, len: number, alongY = false): void {
  pen.begin();
  if (alongY) {
    pen.box(x0, y0, TERR, 0.28, len, 0.7, C.sandstoneLight, { w: W_THIN });
    pen.wall("x+", x0, y0, TERR, 0.28, len).ticks(0.15, 0.1, len - 0.15, 0.56, { n: Math.round(len * 2.2), len: 0.66, ang: Math.PI / 2, jit: 0.02, color: C.sandstoneDark, w: 0.07 });
  } else {
    pen.box(x0, y0, TERR, len, 0.28, 0.7, C.sandstoneLight, { w: W_THIN });
    pen.wall("y+", x0, y0, TERR, len, 0.28).ticks(0.15, 0.1, len - 0.15, 0.56, { n: Math.round(len * 2.2), len: 0.66, ang: Math.PI / 2, jit: 0.02, color: C.sandstoneDark, w: 0.07 });
  }
  pen.end();
}

/** A spiral of box, as a list of points. */
function scroll(cx: number, cy: number, r: number, turns: number, dir: number, phase: number): V2[] {
  const pts: V2[] = [];
  const n = Math.round(turns * 14);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = phase + dir * t * turns * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r * (1 - t * 0.88), cy + Math.sin(a) * r * (1 - t * 0.88)]);
  }
  return pts;
}

/**
 * One of the four broderie parterres: coloured gravel inside an edging of
 * clipped box, embroidered with scrolls of more box, a ribbon of flowers
 * round the outside. The corner nearest the fountain is cut back round it.
 */
function parterre(c: BlockCtx, x0: number, y0: number, x1: number, y1: number): void {
  const { pen, rng } = c;
  // which corner looks at the fountain
  const cxn = Math.abs(x0 - MX) < Math.abs(x1 - MX) ? x0 : x1;
  const cyn = Math.abs(y0 - FY) < Math.abs(y1 - FY) ? y0 : y1;
  const ya = FY + (cyn < FY ? -1 : 1) * Math.sqrt(FR * FR - (cxn - MX) * (cxn - MX));
  const xa = MX + (cxn < MX ? -1 : 1) * Math.sqrt(FR * FR - (cyn - FY) * (cyn - FY));
  const arc: V2[] = [];
  const a0 = Math.atan2(ya - FY, cxn - MX);
  let a1 = Math.atan2(cyn - FY, xa - MX);
  if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
  if (a0 - a1 > Math.PI) a1 += Math.PI * 2;
  for (let k = 0; k <= 6; k++) arc.push([MX + Math.cos(a0 + ((a1 - a0) * k) / 6) * FR, FY + Math.sin(a0 + ((a1 - a0) * k) / 6) * FR]);
  // the outline, starting from the corner opposite the cut one
  const fx = cxn === x0 ? x1 : x0;
  const fy = cyn === y0 ? y1 : y0;
  const outline: V2[] = [[fx, fy], [cxn, fy], ...arc, [fx, cyn]];
  const mid: V2 = [(x0 + x1) / 2, (y0 + y1) / 2];
  const inset = (k: number): V2[] => outline.map(([x, y]) => [x + Math.sign(mid[0] - x) * k * (x === cxn || x === fx ? 1 : 0.6), y + Math.sign(mid[1] - y) * k * (y === cyn || y === fy ? 1 : 0.6)] as V2);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.poly(outline, C.grassLight, { outline: true, w: W_THIN, layer: 1 });
    g.poly(inset(0.75), GRAVEL, { layer: 2, grain: 0.8 });
    g.line(inset(0.75), { closed: true, w: 0.36, color: BOX, kind: L_MARK, wobble: 0.25, layer: 3 });
    // the embroidery: scrolls mirrored about the middle, a lozenge at the heart
    const w = x1 - x0;
    const h = y1 - y0;
    const r = Math.min(w, h) * 0.21;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const px = mid[0] + sx * w * 0.25;
        const py = mid[1] + sy * h * 0.2;
        // keep the embroidery off the cut corner
        if (Math.hypot(px - MX, py - FY) < FR + r + 0.6) continue;
        g.line(scroll(px, py, r, 1.7, sx * sy, sx > 0 ? Math.PI : 0), { w: 0.26, color: BOX, kind: L_MARK, wobble: 0.2, layer: 3 });
      }
    }
    g.loop(
      [
        [mid[0] - 1.1, mid[1]],
        [mid[0], mid[1] - 0.8],
        [mid[0] + 1.1, mid[1]],
        [mid[0], mid[1] + 0.8],
      ],
      { w: 0.26, color: BOX, kind: L_MARK, wobble: 0.2, layer: 3 },
    );
    g.circle(mid[0], mid[1], 0.3, C.red, { seg: 8, layer: 3, grain: 0.3 });
  });
  // the ribbon of flowers, between the turf and the box
  pen.obj(() => {
    const ring = inset(0.38);
    const g = pen.floor(0, 4);
    for (let k = 0; k < ring.length; k++) {
      const [ax, ay] = ring[k];
      const [bx, by] = ring[(k + 1) % ring.length];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 0.55));
      for (let q = 0; q < n; q++) g.circle(ax + ((bx - ax) * q) / n, ay + ((by - ay) * q) / n, 0.15, rng.pick(TULIP), { seg: 6, grain: 0 });
    }
  });
}

/** The Belvedere: a tea house of three storeys, eight-sided here, a copper dome on top carrying a gilt group. */
function belvedere(c: BlockCtx, x: number, y: number): void {
  const { pen, rng } = c;
  const r = 2.3;
  const h = 7.6;
  const wall: RGB = mixRGB(C.palace, C.grassLight, 0.25);
  const oct: V2[] = [];
  for (let k = 0; k < 8; k++) oct.push([x + Math.cos(Math.PI / 8 + (k * Math.PI) / 4) * r, y + Math.sin(Math.PI / 8 + (k * Math.PI) / 4) * r]);
  pen.obj(() => {
    pen.extrude(oct, 0, h, wall, { crease: 30 });
    for (const k of [-1, 0, 1]) {
      const a0 = Math.PI / 8 + (k * Math.PI) / 4;
      const { f, w } = side(pen, x, y, 0, r, a0, a0 + Math.PI / 4);
      f.rect(0, 0, w, 0.4, C.stone, { grain: 0.5 });
      for (let i = 0; i < 3; i++) {
        const b0 = 0.6 + i * 2.35;
        if (i === 0 && k === 0) f.rect(w / 2 - 0.4, 0.4, w / 2 + 0.4, 2.2, C.door, { outline: true, w: W_FINE, layer: 1 });
        else archWindow(f, w / 2 - 0.36, b0, w / 2 + 0.36, b0 + 1.7, rng.chance(0.7), C.white);
        f.rect(0, b0 + 1.95, w, b0 + 2.1, C.white, { grain: 0.4 });
      }
      f.rect(0, 0.4, 0.13, h, C.white, { grain: 0.4 });
      f.rect(w - 0.13, 0.4, w, h, C.white, { grain: 0.4 });
    }
    pen.cyl(x, y, h, r + 0.25, 0.3, C.white, { seg: 16 });
  });
  pen.obj(() => {
    pen.dome(x, y, h + 0.3, r + 0.05, 2.1, C.copper, { seg: 12, rings: 4 });
    // three gilt figures holding up a basket of flowers
    const cd = pen.card(x, y, h + 2.35);
    for (const a of [-0.3, 0, 0.3]) cd.bar(a, 0, a * 0.5, 0.75, 0.14, C.gold);
    cd.ellipse(0, 0.95, 0.42, 0.24, C.gold, { outline: true, w: W_FINE, seg: 9, layer: 1, glow: 0.12 });
  }, 0.18);
}

// ---------------------------------------------------------------- the place

export const charlottenburg: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(24, 23.2, 1);
  const y0 = E + 0.6;

  // the four parterres, in pairs either side of the cross walk
  const P: [number, number, number, number][] = [
    [9.2, 19.6, 20.8, 26.2],
    [27.2, 19.6, 38.8, 26.2],
    [9.2, 29.6, 20.8, 36.2],
    [27.2, 29.6, 38.8, 36.2],
  ];
  // the carp pond, along the front
  const PY = 40.75;
  const PRX = 11.4;
  const PRY = 2.25;
  const pond: V2[] = [];
  for (let k = 0; k < 30; k++) {
    const t = (k / 30) * Math.PI * 2;
    // squarer than an ellipse: a basin, not a lake
    const cx = Math.cos(t);
    const sy = Math.sin(t);
    pond.push([MX + Math.sign(cx) * Math.pow(Math.abs(cx), 0.7) * PRX, PY + Math.sign(sy) * Math.pow(Math.abs(sy), 0.7) * PRY]);
  }

  c.early(() => {
    const g = pen.floor(0, 1);
    // gravel everywhere, raked; turf down the two sides, under the limes
    g.rect(E, y0 + 6.6, B - E, B - E, C.path);
    pen.floor(0, 2).ticks(E + 0.3, y0 + 7, B - E - 0.3, B - E - 0.3, { n: 150, len: 0.3, ang: -0.78, jit: 0.2, color: mixRGB(C.path, C.woodDark, 0.3), w: 0.05 });
    for (const x of [E + 0.2, B - E - 2.7]) {
      g.rect(x, 13.2, x + 2.5, B - E - 0.2, C.grass, { outline: true, w: W_THIN, layer: 1 });
    }
    // the stone-edged round of the great fountain
    g.circle(MX, FY, FR - 0.7, C.plaza, { seg: 28, layer: 1, outline: true, w: W_FINE });
    // the pond
    g.poly(pond, C.water, { kind: F_WATER, layer: 1, outline: true, w: W_THIN, ink: C.waterInk });
    pen.floor(0, 3).ticks(MX - PRX, PY - PRY, MX + PRX, PY + PRY, {
      n: 46,
      len: 1.2,
      ang: -Math.PI / 4,
      jit: 0.08,
      bend: 0.22,
      color: C.waterInk,
      w: 0.07,
      kind: L_RIPPLE,
      alpha: 0.75,
      inside: (a, b) => Math.pow(Math.abs((a - MX) / (PRX - 0.6)), 2.4) + Math.pow(Math.abs((b - PY) / (PRY - 0.4)), 2.4) < 1,
    });
    // the terrace, and three steps down from it
    pen.box(15, y0 + 6.6, 0, 18, TY1 - (y0 + 6.6), TERR, C.sandstoneLight, { top: C.plaza, w: W_THIN });
    for (let k = 0; k < 3; k++) pen.box(21, TY1 + k * 0.4, 0, 6, 0.4, TERR - (k + 1) * 0.125, C.sandstoneLight, { w: W_FINE });
  });
  for (const [x0, yy0, x1, y1] of P) parterre(c, x0, yy0, x1, y1);

  palace(c);

  // ---- the terrace: a balustrade with urns, broken for the steps
  balustrade(pen, 15, TY1 - 0.3, 6);
  balustrade(pen, 27, TY1 - 0.3, 6);
  balustrade(pen, 15, 13.6, TY1 - 0.3 - 13.6, true);
  balustrade(pen, 32.72, 13.6, TY1 - 0.3 - 13.6, true);
  for (const x of [15.14, 20.86, 27.14, 32.86]) {
    pen.obj(() => {
      const cd = pen.card(x, TY1 - 0.16, TERR + 0.7);
      cd.poly(
        [
          [-0.1, 0],
          [0.1, 0],
          [0.26, 0.42],
          [0.13, 0.66],
          [-0.13, 0.66],
          [-0.26, 0.42],
        ],
        MARBLE,
        { outline: true, w: W_FINE },
      );
      cd.ticks(-0.2, 0.62, 0.2, 1.0, { n: 5, len: 0.3, ang: 1.57, jit: 0.6, color: rng.pick([C.red, C.pink, C.purple]), w: 0.12, layer: 1 });
    });
  }
  // orange trees along the Orangery, and in two rows down the middle walk with cone yews between
  for (let k = 0; k < 4; k++) orangeTree(pen, rng, 37.4 + k * 1.75, 13.0);
  for (const [y, kind] of [
    [20.2, 0],
    [22.9, 1],
    [25.4, 0],
    [30.4, 0],
    [32.9, 1],
    [35.6, 0],
  ]) {
    for (const x of [MX - 2.5, MX + 2.5]) {
      if (kind) yew(pen, x, y, x > MX && y < FY ? 2.5 : 1.8);
      else orangeTree(pen, rng, x, y);
    }
  }
  // the limes, pleached, in a row down each side, a hedge behind them
  for (const x of [E + 1.45, B - E - 1.45]) {
    for (let y = 14.6; y < B - E - 1; y += 2.65) {
      if (x < MX && y > 35.5) continue;
      pleached(pen, x, y);
    }
  }
  pen.obj(() => pen.box(E + 0.05, 13.4, 0, 0.55, 22.4, 1.7, C.hedge, { w: W_THIN }));
  pen.obj(() => pen.box(B - E - 0.6, 13.4, 0, 0.55, B - E - 0.4 - 13.4, 1.5, C.hedge, { w: W_THIN }));
  // marble on plinths at the ends of the cross walk and the corners of the garden
  for (const [x, y, fl] of [
    [7.45, FY, false],
    [40.55, FY, true],
    [7.45, 18.0, false],
    [40.55, 18.0, true],
    [40.55, 38.1, true],
    [14.2, 38.35, false],
  ] as [number, number, boolean][]) {
    figure(pen, x, y, fl);
  }
  // lanterns along the walks
  for (const [x, y] of [
    [7.5, 22.8],
    [7.5, 32.8],
    [40.5, 22.8],
    [40.5, 32.8],
    [16.4, 17.85],
    [31.6, 17.85],
    [19.6, 37.9],
    [28.4, 37.9],
  ]) {
    lamp(pen, x, y, 0, 2.9);
  }

  // ---- the great fountain: the basin and its pedestal are drawn; the water is a mover
  pen.obj(() => {
    pen.cyl(MX, FY, 0, 3.0, 0.5, C.sandstoneLight, { seg: 20 });
    pen.floor(0.52, 1).circle(MX, FY, 2.65, C.water, { kind: F_WATER, seg: 20, outline: true, w: W_FINE, ink: C.waterInk });
    pen.cyl(MX, FY, 0.5, 0.5, 0.55, C.sandstone, { seg: 8 });
    pen.cyl(MX, FY, 1.05, 0.85, 0.16, C.sandstoneLight, { seg: 10 });
    // lit from under the water at night
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      pen.stroke(
        [
          [MX + Math.cos(a) * 1.9, FY + Math.sin(a) * 1.9, 0.56],
          [MX + Math.cos(a) * 1.95, FY + Math.sin(a) * 1.95, 0.56],
        ],
        { w: 0.5, kind: L_LIGHT, wobble: 0, alpha: 0.8 },
      );
    }
  });

  // ---- the pond: a little iron bridge across it on the axis, and the Belvedere in the corner
  pen.push(MX + 0.85, PY - PRY - 0.35, 0, 90);
  bridge(pen, rng, PRY * 2 + 0.7, 1.7, { water: 0.45, hump: 0.85, rail: "iron", bikes: false, lamps: false, color: C.sandstone });
  pen.pop();
  belvedere(c, 7.4, 40.7);

  // ---- people. On the terrace: a string quartet, and the audience that has come for it
  const tz = TERR;
  const players: { x: number; y: number; cello: boolean; look: Look; flip: boolean }[] = [
    { x: 16.6, y: 14.5, cello: false, look: { ...randomLook(rng), top: C.black, legs: C.black, hat: null }, flip: false },
    { x: 17.0, y: 15.5, cello: false, look: { ...randomLook(rng), top: C.black, legs: C.black, hat: null }, flip: false },
    { x: 17.3, y: 16.4, cello: true, look: { ...randomLook(rng), top: C.black, legs: C.black, hat: null }, flip: false },
    { x: 16.3, y: 13.6 + 0.05, cello: false, look: { ...randomLook(rng), top: C.white, legs: C.black, hat: null }, flip: false },
  ];
  const musician = (p: Pen, lk: Look, cello: boolean, frame: number) => {
    p.box(-0.22, -0.22, 0, 0.44, 0.44, 0.42, C.white, { w: W_FINE });
    person(p, 0, 0, 0.28, lk, "bust", false);
    const cd = p.card(0, 0, 0.3);
    const wood: RGB = [150, 86, 46];
    if (cello) {
      cd.ellipse(0.32, 0.38, 0.24, 0.42, wood, { outline: true, w: W_FINE, layer: 6, seg: 10 });
      cd.bar(0.32, 0.8, 0.32, 1.45, 0.07, wood, { layer: 6 });
      cd.seg(0.0, 0.5 + frame * 0.14, 0.75, 0.38 + frame * 0.1, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 7 });
    } else {
      cd.ellipse(0.3, 0.98, 0.2, 0.12, wood, { outline: true, w: W_FINE, layer: 6, seg: 8 });
      cd.seg(0.02 + frame * 0.16, 1.2 - frame * 0.1, 0.62 + frame * 0.1, 0.9 + frame * 0.1, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 7 });
    }
  };
  players.forEach((pl, i) => {
    const frames = [0, 1].map((fr) => makeSprite((p) => musician(p, pl.look, pl.cello, fr), 0, 60 + i));
    c.movers.push((m) => {
      m.put(frames[Math.floor(m.t * 2.3 + i * 0.5) & 1], c.ox + pl.x, c.oy + pl.y, c.oz + tz, c.done);
    });
  });
  // music stands
  pen.obj(() => {
    for (const pl of players) {
      const cd = pen.card(pl.x + 0.75, pl.y + 0.15, tz);
      cd.bar(0, 0, 0, 0.95, 0.05, C.black);
      cd.rect(-0.22, 0.85, 0.22, 1.2, C.white, { outline: true, w: W_FINE, layer: 1 });
    }
  });
  // rows of white chairs, nearly all taken
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) {
      const x = 19.0 + i * 0.95;
      const y = 14.0 + k * 0.95;
      pen.box(x - 0.2, y - 0.2, tz, 0.4, 0.4, 0.42, C.white, { w: W_FINE });
      if (i + k !== 4) person(pen, x, y, tz + 0.28, randomLook(rng), "bust", true);
    }
  }
  // latecomers, and somebody who only came out for the view
  person(pen, 29.4, 15.4, tz, randomLook(rng), "stand", true);
  person(pen, 30.2, 15.7, tz, randomLook(rng), "stand", true);
  person(pen, 31.6, 14.2, tz, randomLook(rng), "wave", false);

  // on the steps: a wedding. The couple, the photographer down on one knee, the friend with the reflector
  const bride: Look = { skin: [246, 211, 184], hair: [124, 82, 48], top: C.white, legs: C.white, long: true, hat: null };
  const groom: Look = { skin: [211, 154, 108], hair: [43, 32, 25], top: C.blueDark, legs: C.blueDark, long: false, hat: null };
  person(pen, 23.6, TY1 + 0.25, TERR - 0.125, bride, "stand", false);
  pen.obj(() => {
    pen.card(23.6, TY1 + 0.25, TERR - 0.125).poly(
      [
        [-0.36, 0.8],
        [0.36, 0.8],
        [0.7, 0.02],
        [-0.7, 0.02],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 1 },
    );
  });
  person(pen, 24.45, TY1 + 0.25, TERR - 0.125, groom, "stand", true);
  person(pen, 24.9, 20.3, -0.25, { ...randomLook(rng), top: C.black }, "sit", true);
  person(pen, 22.5, 20.0, 0, randomLook(rng), "cheer", false);
  pen.obj(() => pen.card(22.5, 20.0, 1.9).ellipse(0, 0.5, 0.62, 0.5, C.white, { outline: true, w: W_FINE, seg: 12, layer: 6 }));

  // two gardeners: one with a barrow on the cross walk, one up a ladder with the shears
  person(pen, 13.4, FY + 0.3, 0, { ...randomLook(rng), top: C.green, hat: C.ochre }, "walkA", false);
  pen.obj(() => {
    pen.box(14.0, FY - 0.1, 0.35, 1.1, 0.75, 0.42, C.green, { w: W_FINE });
    pen.cyl(15.25, FY + 0.28, 0.03, 0.26, 0.08, C.charcoal, { seg: 7 });
    pen.floor(0.78, 1).ticks(14.05, FY - 0.05, 15.05, FY + 0.6, { n: 9, len: 0.4, ang: 0.6, jit: 1, color: C.leafDark, w: 0.14 });
  });
  pen.obj(() => {
    for (const o of [-0.25, 0.25]) {
      pen.stroke(
        [
          [MX + 3.6, 22.9 + o, 0],
          [MX + 2.85, 22.9 + o, 2.3],
        ],
        { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    for (let k = 1; k < 6; k++) {
      pen.stroke(
        [
          [MX + 3.6 - k * 0.125, 22.65, k * 0.38],
          [MX + 3.6 - k * 0.125, 23.15, k * 0.38],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
  });
  person(pen, MX + 3.25, 22.9, 1.1, { ...randomLook(rng), top: C.green, hat: C.ochre }, "wave", true);

  // a school class in a crocodile on the cross walk, two by two behind the teacher, one pair not listening
  for (let k = 0; k < 5; k++) {
    for (const o of [-0.45, 0.45]) {
      person(pen, 30.0 + k * 1.05, FY + o, 0, randomLook(rng), k === 3 && o > 0 ? "cheer" : k % 2 ? "walkA" : "walkB", false, 0.72);
    }
  }
  person(pen, 35.6, FY, 0, { ...randomLook(rng), hat: null }, "wave", false);
  person(pen, 29.0, FY + 0.1, 0, randomLook(rng), "walkB", false);

  // a guide and her group on the middle walk, all facing the palace
  const guide: Look = { ...randomLook(rng), top: C.red, hat: null };
  person(pen, MX - 0.3, 33.4, 0, guide, "wave", false);
  for (let k = 0; k < 6; k++) {
    const a = 0.5 + (k / 6) * 2.2;
    person(pen, MX + 0.1 + Math.cos(a) * rng.range(1.0, 1.6), 34.6 + Math.sin(a) * rng.range(0.4, 1.0), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), true, rng.chance(0.15) ? 0.72 : 1);
  }
  // a painter at her easel by the pond, getting the dome wrong
  person(pen, 33.4, 38.2, 0, { ...randomLook(rng), top: C.cream, hat: C.sand }, "wave", false);
  pen.obj(() => {
    const cd = pen.card(34.3, 38.3, 0);
    cd.bar(-0.3, 0, 0, 1.3, 0.06, C.woodDark);
    cd.bar(0.3, 0, 0, 1.3, 0.06, C.woodDark);
    cd.rect(-0.45, 0.75, 0.45, 1.8, C.white, { outline: true, w: W_FINE, layer: 1 });
    cd.rect(-0.35, 0.85, 0.35, 1.25, C.palace, { layer: 2, grain: 0.3 });
    cd.circle(0, 1.42, 0.16, C.copper, { layer: 2, seg: 7, grain: 0.3 });
  });
  // children feeding the swans, and somebody telling them not to
  for (const [x, pose] of [
    [16.6, "wave"],
    [17.5, "cheer"],
    [18.3, "stand"],
  ] as [number, "wave" | "cheer" | "stand"][]) {
    person(pen, x, PY - PRY - 0.7 + (x > 17 ? 0.25 : 0), 0, randomLook(rng), pose, false, 0.72);
  }
  person(pen, 19.4, 38.1, 0, randomLook(rng), "stand", true);
  pen.obj(() => {
    const g = pen.floor(0.02, 4);
    for (const [x, y, a, col] of [
      [20.6, 40.6, 0.3, C.orange],
      [21.6, 41.3, 2.8, C.white],
      [26.8, 40.2, 0.9, C.orange],
      [28.2, 41.4, 3.4, C.orange],
      [27.4, 41.9, 0.1, C.red],
      [22.6, 39.9, 2.2, C.orange],
    ] as [number, number, number, RGB][]) {
      g.seg(x - Math.cos(a) * 0.3, y - Math.sin(a) * 0.3, x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, { w: 0.2, color: col, kind: L_MARK, wobble: 0, alpha: 0.85 });
      g.seg(x - Math.cos(a) * 0.3, y - Math.sin(a) * 0.3, x - Math.cos(a - 0.5) * 0.52, y - Math.sin(a - 0.5) * 0.52, { w: 0.09, color: col, kind: L_MARK, wobble: 0, alpha: 0.85 });
    }
    // the heron, on the far bank, very still
    const cd = pen.card(34.6, PY + 1.55, 0.02, true);
    cd.bar(0, 0, 0, 0.7, 0.05, C.greyDark);
    cd.ellipse(0, 0.9, 0.34, 0.24, C.slateLight, { outline: true, w: W_FINE, seg: 9, layer: 1 });
    cd.line(
      [
        [0.24, 1.0],
        [0.42, 1.4],
        [0.34, 1.75],
      ],
      { w: 0.1, color: C.slateLight, kind: L_BAR, wobble: 0 },
    );
    cd.seg(0.34, 1.75, 0.72, 1.68, { w: 0.06, color: C.yellow, kind: L_MARK, wobble: 0, layer: 1 });
  });
  swan(pen, 16.2, 39.9, 0.03, false);
  swan(pen, 31.5, 41.6, 0.03, true);
  swan(pen, 33.2, 40.2, 0.03, true);
  // asleep on a bench in the sun, the paper over his face
  bench(pen, 29.8, 38.35, 0);
  person(pen, 29.7, 38.55, 0.3, { ...randomLook(rng), hat: C.white }, "sit", false);
  bench(pen, 12.4, 38.2, 0);
  person(pen, 12.0, 38.4, 0.3, randomLook(rng), "sit", false);
  person(pen, 12.85, 38.4, 0.3, randomLook(rng), "sit", true);
  // two in the dress of the house's own century, out of a concert and into the garden
  const lady: Look = { skin: [246, 211, 184], hair: C.white, top: C.sky, legs: C.sky, long: true, hat: null };
  person(pen, 19.8, 28.9, 0, lady, "stand", false);
  pen.obj(() => {
    pen.card(19.8, 28.9, 0).poly(
      [
        [-0.34, 0.85],
        [0.34, 0.85],
        [0.85, 0.02],
        [-0.85, 0.02],
      ],
      C.sky,
      { outline: true, w: W_FINE, layer: 1 },
    );
  });
  person(pen, 18.7, 28.7, 0, { skin: [238, 187, 150], hair: C.white, top: C.redDark, legs: C.cream, long: true, hat: C.black }, "stand", true);
  // at the Belvedere, and round the fountain
  person(pen, 10.6, 39.4, 0, randomLook(rng), "stand", false);
  person(pen, 11.3, 40.6, 0, randomLook(rng), "wave", true, 0.72);
  for (const [a, pose, s] of [
    [0.4, "stand", 1],
    [1.3, "wave", 0.72],
    [2.5, "stand", 1],
    [-0.9, "stand", 1],
  ] as [number, "stand" | "wave", number][]) {
    person(pen, MX + Math.cos(a) * 3.6, FY + Math.sin(a) * 3.6, 0, randomLook(rng), pose, Math.cos(a) > 0, s);
  }

  // ---- what moves
  // the fountain. It idles as a low bubble; when the camera comes it climbs to its full height and stays there
  const wx = c.ox + MX;
  const wy = c.oy + FY;
  const wz = c.oz + 1.2;
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(wx, wy, wz + 4, 12)) return;
    const s = c.stay();
    let lift = 1;
    if (s) {
      const up = Math.max(0, Math.min(1, (m.t - (s.at - 0.3)) / 1.5));
      const down = Math.max(0, Math.min(1, (m.t - (s.leave + 0.8)) / 2.2));
      lift = 0.14 + 0.86 * (up * up * (3 - 2 * up)) * (1 - down * down * (3 - 2 * down));
    }
    const H = 8.6 * lift * (1 + 0.025 * Math.sin(m.t * 9));
    // the jet, and the water coming down again all round it
    m.pen.stroke(
      [
        [wx, wy, wz],
        [wx, wy, wz + H],
      ],
      { w: 0.3, color: C.white, kind: L_BAR, wobble: 0 },
    );
    m.pen.stroke(
      [
        [wx, wy, wz],
        [wx, wy, wz + H * 0.96],
      ],
      { w: 0.13, color: C.glassPale, kind: L_BAR, wobble: 0, bias: 0.02 },
    );
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.4;
      const reach = (0.8 + 1.3 * lift) * (1 + 0.08 * Math.sin(m.t * 5 + k));
      const pts: V3[] = [];
      for (let q = 0; q <= 5; q++) {
        const u = q / 5;
        pts.push([wx + Math.cos(a) * reach * u, wy + Math.sin(a) * reach * u, wz + H * (1 - 0.06 * u - 0.94 * u * u) + 0.25 * Math.sin(Math.PI * u) * lift]);
      }
      m.pen.stroke(pts, { w: 0.1, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.9 });
    }
    // lower jets round the rim, leaning in
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const h = 0.9 + 1.5 * lift;
      m.pen.stroke(
        [
          [wx + Math.cos(a) * 2.2, wy + Math.sin(a) * 2.2, wz - 0.65],
          [wx + Math.cos(a) * 1.75, wy + Math.sin(a) * 1.75, wz - 0.65 + h],
          [wx + Math.cos(a) * 1.25, wy + Math.sin(a) * 1.25, wz - 0.65 + h * 0.55],
        ],
        { w: 0.08, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.9 },
      );
    }
  });
  // people taking the air round the outer walk, and two who run it
  const walk = stroll(
    c,
    [
      [8.3, 18.9],
      [39.7, 18.9],
      [39.7, 37.2],
      [8.3, 37.2],
    ],
    1.3,
  );
  for (let k = 0; k < 8; k++) c.movers.push(walker(walk, rng, c.done + rng.range(0, 1)));
  for (let k = 0; k < 2; k++) c.movers.push(walker(walk, rng, c.done + rng.range(0, 1), rng.range(3.0, 3.5)));
  // swans, going about the pond
  const glide: V3[] = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    glide.push([c.ox + 18.4 + Math.cos(a) * 3.9, c.oy + PY + 0.1 + Math.sin(a) * 0.95, c.oz + 0.03]);
  }
  const glideRoute = new Route(glide, true);
  const swans = [0, 1].map((fl) => makeSprite((p) => swan(p, 0, 0, 0, fl === 1), 0, 71));
  for (let k = 0; k < 2; k++) {
    c.movers.push(traveler(glideRoute, { speed: 0.5, at: k * 0.5 + 0.1, born: c.done + k * 0.4, span: 1.5, sprite: (h) => swans[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1] }));
  }
  // swifts round the dome
  const swift = (p: Pen, up: boolean, flip: boolean) => {
    const cd = p.card(0, 0, 0, flip);
    const y = up ? 0.3 : -0.12;
    cd.bar(-0.6, y, -0.15, 0.05, 0.09, C.charcoal);
    cd.bar(0.6, y, 0.15, 0.05, 0.09, C.charcoal);
    cd.ellipse(0, 0, 0.2, 0.09, C.charcoal, { seg: 7, layer: 1 });
  };
  const wing = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => swift(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 5; k++) {
    const r = 3.6 + k * 1.1;
    const sp = (0.8 + 0.1 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 7 + ph) & 1;
      m.put(wing[flap][vx - vy < 0 ? 1 : 0], c.ox + MX + Math.cos(a) * r, c.oy + y0 + 3.4 + Math.sin(a) * r * 0.8, c.oz + 20 + Math.sin(m.t * 0.9 + ph) * 1.6, born);
    });
  }
};
