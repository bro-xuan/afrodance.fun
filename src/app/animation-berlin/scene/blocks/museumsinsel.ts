// Museumsinsel: the island in the Spree between the Linden and Alexanderplatz.
// The cathedral stands across it with its front to the Lustgarten, the
// Bode-Museum fills the island's northern point like the bow of a ship, and
// south of the street that crosses the island there is a patch of shade where
// people fish, paint and play the cello. When the camera arrives the
// cathedral's bells are rung and the pigeons leave the dome.
//
// The city lays the island's ground, its walls and railing and the two
// bridges. Here local (0, 0) is the island's north-west corner: the island
// runs from x = 0 to W and from y = 0 (the north tip) to y = L (the south
// tip), z = 0 on its pavement. The real cathedral faces west; the ensemble is
// turned a quarter so that the camera sees its front.

import { RGB, V2, V3, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { fountain, picnic, queue } from "../berlin";
import { AXIS_Y, ISLAND } from "../city";
import { W_FINE, W_THIN, Look, archWindow, bench, lamp, person, randomLook, tree } from "../kit";
import { Route, makeSprite, rounded, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const W = ISLAND.x1 - ISLAND.x0;
const L = ISLAND.y1 - ISLAND.y0;
/** The street that crosses the island (the city's walkers use it): keep off y = AX - 2.5 to AX + 2.5. */
const AX = AXIS_Y - ISLAND.y0;
const MID = W / 2;

// the cathedral: its outer corners, its body, the middle of its dome
const DX0 = 1.8;
const DX1 = W - 1.8;
const DY0 = 9.6;
const DY1 = 21.0;
const BX0 = DX0 + 0.8;
const BX1 = DX1 - 0.8;
const BY0 = DY0 + 0.7;
const BY1 = DY1 - 0.8;
const BODY = 9.6;
const TOWER = 2.9;
const TOWER_H = 12.6;
const CY = (BY0 + BY1) / 2 - 0.2;
const DRUM_R = 4.9;
const DRUM_H = 3.4;
const DOME_H = 6.4;

function stroll(c: BlockCtx, pts: V2[], r = 0.9): Route {
  return new Route(
    rounded(
      pts.map((p) => [c.ox + p[0], c.oy + p[1], c.oz] as V3),
      true,
      r,
    ),
    true,
  );
}

/**
 * A drawing plane on one flat piece of a curved wall, from (ax, ay) to (bx, by)
 * going anticlockwise round the building (in world axes), b up from z. Null if
 * that piece faces away from the camera.
 */
function facet(pen: Pen, ax: number, ay: number, bx: number, by: number, z: number): { f: Plane; len: number } | null {
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  if (uy - ux < 0.12) return null;
  return { f: pen.plane([ax, ay, z], [ux, uy, 0], [0, 0, 1], 1), len };
}

/** An arch-topped shape on a wall plane: a niche, a belfry opening. */
function archShape(a0: number, b0: number, a1: number, b1: number): V2[] {
  const r = (a1 - a0) / 2;
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, b1 - r],
  ];
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI;
    pts.push([a0 + r + Math.cos(t) * r, b1 - r + Math.sin(t) * r]);
  }
  pts.push([a0, b1 - r]);
  return pts;
}

// ---------------------------------------------------------------- the cathedral

function dom(c: BlockCtx): void {
  const { pen, rng } = c;
  const stone = C.domStone;
  const dark = C.domStoneDark;
  const light = C.sandstoneLight;
  const bw = BX1 - BX0;
  const bd = BY1 - BY0;
  // the body: a plinth, tall arched windows, a cornice, and copper over everything
  pen.obj(() => {
    pen.box(BX0, BY0, 0, bw, bd, BODY, stone, { top: C.copper });
    const f = pen.wall("y+", BX0, BY0, 0, bw, bd);
    f.rect(0, 0, bw, 1.1, dark, { grain: 0.7 });
    f.rect(0, BODY - 0.55, bw, BODY, light, { grain: 0.5 });
    f.seg(0, BODY - 0.55, bw, BODY - 0.55, { w: 0.06 });
    for (const a of [2.95, bw - 2.95]) {
      archWindow(f, a - 0.6, 2.0, a + 0.6, 6.8, rng.chance(0.7), light);
      f.rect(a - 0.75, 7.3, a + 0.75, 8.6, dark, { outline: true, w: W_FINE, grain: 0.5 });
    }
    const g = pen.wall("x+", BX0, BY0, 0, bw, bd);
    g.rect(0, 0, bd, 1.1, dark, { grain: 0.7 });
    g.rect(0, BODY - 0.55, bd, BODY, light, { grain: 0.5 });
    g.seg(0, BODY - 0.55, bd, BODY - 0.55, { w: 0.06 });
    for (const a of [3.25, bd / 2, bd - 3.25]) {
      archWindow(g, a - 0.6, 2.0, a + 0.6, 6.8, rng.chance(0.7), light);
      g.seg(a - 1.05, 1.1, a - 1.05, BODY - 0.55, { w: 0.1, color: light, kind: L_MARK, wobble: 0.2 });
    }
    g.seg(bd - 2.2, 1.1, bd - 2.2, BODY - 0.55, { w: 0.1, color: light, kind: L_MARK, wobble: 0.2 });
  });

  // four corner towers, each with a belfry stage and a little copper dome with a gold finial
  const towers: V2[] = [
    [DX0, DY0],
    [DX1 - TOWER, DY0],
    [DX0, DY1 - TOWER],
    [DX1 - TOWER, DY1 - TOWER],
  ];
  towers.forEach(([x0, y0], k) => {
    pen.obj(() => {
      pen.box(x0, y0, 0, TOWER, TOWER, TOWER_H, stone);
      for (const sd of ["x+", "y+"] as const) {
        const tf = pen.wall(sd, x0, y0, 0, TOWER, TOWER);
        tf.rect(0, 0, TOWER, 1.1, dark, { grain: 0.7 });
        tf.rect(0, BODY - 0.55, TOWER, BODY, light, { grain: 0.5 });
        archWindow(tf, TOWER / 2 - 0.5, 2.0, TOWER / 2 + 0.5, 5.2, rng.chance(0.6), light);
        archWindow(tf, TOWER / 2 - 0.5, 6.0, TOWER / 2 + 0.5, 8.5, rng.chance(0.6), light);
        // the belfry opening (the bells themselves are hung by a mover, so that they can swing)
        tf.poly(archShape(TOWER / 2 - 0.72, 10.0, TOWER / 2 + 0.72, 12.0), scaleRGB(stone, 0.5), { layer: 1, grain: 0.6 });
        tf.loop(archShape(TOWER / 2 - 0.72, 10.0, TOWER / 2 + 0.72, 12.0), { w: W_FINE, color: light, kind: L_MARK, layer: 2 });
        tf.rect(0, TOWER_H - 0.45, TOWER, TOWER_H, light, { grain: 0.5 });
      }
    }, 0.08 + k * 0.02);
    const cx = x0 + TOWER / 2;
    const cy = y0 + TOWER / 2;
    pen.obj(() => {
      pen.box(x0 - 0.16, y0 - 0.16, TOWER_H, TOWER + 0.32, TOWER + 0.32, 0.3, light, { w: W_THIN });
      pen.cyl(cx, cy, TOWER_H + 0.3, 1.25, 1.0, stone, { seg: 8 });
      pen.dome(cx, cy, TOWER_H + 1.3, 1.42, 1.75, C.copper, { seg: 10, rings: 3 });
      pen.cyl(cx, cy, TOWER_H + 2.95, 0.28, 0.6, C.copper, { seg: 6 });
      pen.pole([cx, cy, TOWER_H + 3.5], [cx, cy, TOWER_H + 4.7], 0.09, C.gold, { ink: false });
      pen.card(cx, cy, TOWER_H + 4.25).bar(-0.26, 0, 0.26, 0, 0.09, C.gold, { ink: false });
    }, 0.24 + k * 0.02);
  });

  // the drum under the great dome, a ring of arched windows round it
  pen.obj(() => {
    pen.cyl(MID, CY, BODY, DRUM_R, DRUM_H, stone, { seg: 16, top: C.copper });
    const n = 16;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const fc = facet(pen, MID + Math.cos(a0) * DRUM_R, CY + Math.sin(a0) * DRUM_R, MID + Math.cos(a1) * DRUM_R, CY + Math.sin(a1) * DRUM_R, BODY);
      if (!fc) continue;
      archWindow(fc.f, fc.len / 2 - 0.5, 0.75, fc.len / 2 + 0.5, 2.75, rng.chance(0.75), light);
      fc.f.rect(0, DRUM_H - 0.4, fc.len, DRUM_H, light, { grain: 0.5 });
      fc.f.seg(0, 0.05, 0, DRUM_H - 0.4, { w: 0.09, color: light, kind: L_MARK, wobble: 0.2 });
    }
  }, 0.2);
  // the dome: verdigris, ribbed
  const z0 = BODY + DRUM_H;
  pen.obj(() => {
    pen.dome(MID, CY, z0, DRUM_R - 0.1, DOME_H, C.copper, { seg: 16, rings: 6 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      if (Math.cos(a) + Math.sin(a) < -0.35) continue;
      const rib: V3[] = [];
      for (let q = 0; q <= 6; q++) {
        const ph = (q / 6) * Math.PI * 0.5;
        const rr = Math.cos(ph) * (DRUM_R - 0.08);
        rib.push([MID + Math.cos(a) * rr, CY + Math.sin(a) * rr, z0 + Math.sin(ph) * DOME_H]);
      }
      pen.stroke(rib, { w: 0.08, color: C.copperDark, kind: L_MARK, wobble: 0.25, bias: 0.05 });
    }
  }, 0.34);
  // the lantern, lit at night, and the gold cross
  const zl = z0 + DOME_H - 0.3;
  pen.obj(() => {
    pen.cyl(MID, CY, zl, 1.15, 0.35, light, { seg: 10 });
    pen.cyl(MID, CY, zl + 0.35, 0.95, 1.25, C.lamp, { seg: 10, glow: 0.95, grain: 0.4 });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      if (Math.cos(a) + Math.sin(a) < -0.2) continue;
      pen.stroke(
        [
          [MID + Math.cos(a) * 0.97, CY + Math.sin(a) * 0.97, zl + 0.35],
          [MID + Math.cos(a) * 0.97, CY + Math.sin(a) * 0.97, zl + 1.6],
        ],
        { w: 0.09, color: stone, kind: L_MARK, wobble: 0, bias: 0.04 },
      );
    }
    pen.dome(MID, CY, zl + 1.6, 1.2, 1.0, C.copper, { seg: 10, rings: 3 });
  }, 0.46);
  pen.obj(() => {
    const zc = zl + 2.55;
    pen.cyl(MID, CY, zc, 0.24, 0.3, C.gold, { seg: 6 });
    pen.pole([MID, CY, zc + 0.3], [MID, CY, zc + 2.3], 0.13, C.gold);
    pen.card(MID, CY, zc + 1.6).bar(-0.55, 0, 0.55, 0, 0.13, C.gold);
  }, 0.56);

  // the front: a tall niche between pairs of columns, gold mosaic in its head, a pediment over all
  const px0 = MID - 2.85;
  const pw = 5.7;
  pen.obj(() => {
    pen.box(px0, BY1, 0, pw, 0.8, 11.0, stone);
    const pf = pen.wall("y+", px0, BY1, 0, pw, 0.8);
    pf.rect(0, 0, pw, 0.6, dark, { grain: 0.7 });
    pf.poly(archShape(1.35, 0.6, pw - 1.35, 8.1), scaleRGB(stone, 0.46), { layer: 1, grain: 0.6 });
    const head: V2[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI;
      head.push([pw / 2 + Math.cos(t) * 1.3, 6.65 + Math.sin(t) * 1.3]);
    }
    pf.poly(head, C.gold, { layer: 2, grain: 0.4, glow: 0.45, outline: true, w: W_FINE });
    pf.rect(pw / 2 - 0.75, 0.6, pw / 2 + 0.75, 3.7, C.doorRed, { layer: 2, outline: true, w: W_FINE });
    pf.seg(pw / 2, 0.6, pw / 2, 3.7, { w: 0.05, wobble: 0, layer: 3 });
    pf.rect(0, 9.1, pw, 9.6, light, { layer: 1, grain: 0.5 });
    pf.rect(0.5, 9.75, pw - 0.5, 10.75, light, { layer: 1, grain: 0.5, outline: true, w: W_FINE });
    pf.ticks(0.7, 9.9, pw - 0.7, 10.6, { n: 12, len: 0.55, ang: Math.PI / 2, jit: 0.3, color: dark, w: 0.08, layer: 2 });
    // floodlights up the front, for the night
    for (const a of [0.7, pw - 0.7]) pf.seg(a, 0.7, a, 7.8, { w: 1.3, kind: L_LIGHT, wobble: 0, alpha: 0.3, layer: 3 });
  }, 0.14);
  pen.obj(() => {
    // the steps, the columns standing on the top one, and what they carry
    pen.box(MID - 4.2, DY1, 0, 8.4, 1.65, 0.2, light, { w: W_THIN });
    pen.box(MID - 3.9, DY1, 0.2, 7.8, 1.2, 0.2, light, { w: W_THIN });
    pen.box(MID - 3.6, DY1, 0.4, 7.2, 0.78, 0.2, light, { w: W_THIN });
    for (const a of [0.42, 1.02, pw - 1.02, pw - 0.42]) pen.cyl(px0 + a, DY1 + 0.36, 0.6, 0.25, 7.7, light, { seg: 7, r2: 0.21 });
    pen.box(px0 - 0.1, DY1, 8.3, pw + 0.2, 0.72, 0.75, light, { w: W_THIN });
  }, 0.2);
  pen.obj(() => {
    pen.gable(px0 - 0.15, BY1 - 0.2, 11.0, pw + 0.3, 1.2, 1.5, "y", C.copper, { gable: stone });
    // three figures on the pediment
    for (const [a, s] of [
      [0.3, 0.8],
      [pw / 2, 1],
      [pw - 0.3, 0.8],
    ]) {
      const cd = pen.card(px0 + a, BY1 + 0.9, 11.0 + (a === pw / 2 ? 1.5 : 0.1));
      cd.poly(
        [
          [-0.22 * s, 0],
          [0.22 * s, 0],
          [0.16 * s, 0.85 * s],
          [-0.16 * s, 0.85 * s],
        ],
        light,
        { outline: true, w: W_FINE },
      );
      cd.circle(0, 1.02 * s, 0.17 * s, light, { outline: true, w: W_FINE, seg: 7, layer: 1 });
    }
  }, 0.3);
}

// ---------------------------------------------------------------- the Bode-Museum

/** The museum on the island's northern point: a rounded prow of sandstone under a copper dome. */
function bode(c: BlockCtx): void {
  const { pen, rng } = c;
  const stone = C.sandstone;
  const light = C.sandstoneLight;
  const dark = C.sandstoneDark;
  const H = 7.0;
  const cy = ISLAND.tipN;
  const rx = MID - 1.5;
  const ry = ISLAND.tipN - 1.3;
  // round the point from the west end to the east end, then straight back along the south wall
  const n = 14;
  const foot: V2[] = [];
  for (let k = 0; k <= n; k++) {
    const t = Math.PI + (k / n) * Math.PI;
    foot.push([MID + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  pen.obj(() => {
    pen.extrude(foot, 0, H, stone, { top: C.zinc, crease: 30 });
    for (let k = 0; k < foot.length; k++) {
      const a = foot[k];
      const b = foot[(k + 1) % foot.length];
      const fc = facet(pen, a[0], a[1], b[0], b[1], 0);
      if (!fc) continue;
      const { f, len } = fc;
      f.rect(0, 0, len, 1.5, dark, { grain: 0.7 });
      f.rect(0, H - 0.5, len, H, light, { grain: 0.5 });
      f.seg(0, H - 0.5, len, H - 0.5, { w: 0.06 });
      const m = Math.max(1, Math.round(len / 1.9));
      for (let q = 0; q < m; q++) {
        const mid = ((q + 0.5) * len) / m;
        archWindow(f, mid - 0.45, 2.1, mid + 0.45, 4.3, rng.chance(0.7), light);
        f.rect(mid - 0.4, 4.9, mid + 0.4, 5.9, C.glass, { outline: true, w: W_FINE, layer: 1, glow: rng.chance(0.6) ? 1 : 0, ink: light });
        // an engaged column between each pair of windows
        f.seg((q * len) / m + 0.08, 1.5, (q * len) / m + 0.08, H - 0.5, { w: 0.16, color: light, kind: L_MARK, wobble: 0.15 });
      }
    }
  });
  // the dome over the point
  const dy = cy - ry * 0.52;
  pen.obj(() => {
    pen.cyl(MID, dy, H, 3.0, 1.2, stone, { seg: 14, top: C.copper });
    for (let k = 0; k < 14; k++) {
      const a0 = (k / 14) * Math.PI * 2;
      const a1 = ((k + 1) / 14) * Math.PI * 2;
      const fc = facet(pen, MID + Math.cos(a0) * 3.0, dy + Math.sin(a0) * 3.0, MID + Math.cos(a1) * 3.0, dy + Math.sin(a1) * 3.0, H);
      if (fc) fc.f.rect(fc.len / 2 - 0.36, 0.3, fc.len / 2 + 0.36, 0.95, C.glass, { outline: true, w: W_FINE, glow: rng.chance(0.7) ? 1 : 0, ink: light });
    }
  }, 0.15);
  pen.obj(() => {
    pen.dome(MID, dy, H + 1.2, 2.9, 3.5, C.copper, { seg: 14, rings: 5 });
    pen.cyl(MID, dy, H + 4.55, 0.42, 0.7, C.copper, { seg: 7 });
    pen.pole([MID, dy, H + 5.2], [MID, dy, H + 6.2], 0.08, C.gold, { ink: false });
  }, 0.28);
}

// ---------------------------------------------------------------- small things

/** A pigeon, wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

/** The big polished granite bowl that was the wonder of Biedermeier Berlin. */
function granitBowl(pen: Pen, x: number, y: number): void {
  const granite: RGB = [176, 110, 98];
  pen.obj(() => {
    pen.box(x - 0.9, y - 0.9, 0, 1.8, 1.8, 0.3, C.stone, { w: W_THIN });
    pen.cyl(x, y, 0.3, 0.42, 0.55, granite, { seg: 8 });
    pen.cyl(x, y, 0.85, 0.5, 0.5, granite, { seg: 14, r2: 1.75, top: scaleRGB(granite, 1.12) });
  });
}

/** An ice-cream cart under a parasol. */
function eisCart(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.box(x - 0.85, y - 0.5, 0.35, 1.7, 1.0, 0.85, C.white, { w: W_THIN });
    const f = pen.wall("y+", x - 0.85, y - 0.5, 0.35, 1.7, 1.0);
    for (let k = 0; k < 4; k++) f.rect(0.1 + k * 0.4, 0.08, 0.3 + k * 0.4, 0.5, k % 2 ? C.pink : C.sky, { grain: 0.4 });
    f.text("EIS", 0.85, 0.56, 0.24, { align: "c", layer: 1, w: 0.05 });
    for (const o of [-0.55, 0.55]) pen.card(x + o, y + 0.52, 0).circle(0, 0.36, 0.36, null, { ink: C.ink, w: 0.08, seg: 10 });
    pen.pole([x, y, 1.2], [x, y, 2.75], 0.07, C.white, { ink: false });
    pen.cone(x, y, 2.5, 1.35, 0.5, C.pink, { seg: 8, crease: 0.5 });
  });
}

/** The kiosk that sells tickets for the boats. */
function kiosk(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.box(x, y, 0, 2.4, 1.7, 2.5, C.cream, { top: C.blueDark });
    const f = pen.wall("y+", x, y, 0, 2.4, 1.7);
    f.rect(0.35, 1.0, 2.05, 1.95, C.glass, { outline: true, w: W_FINE, glow: 0.7 });
    f.rect(0, 0, 2.4, 0.45, C.blueDark, { grain: 0.5 });
    const sg = pen.plane([x - 0.1, y + 1.72, 2.5], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 2.6, 0.6, C.blueDark, { outline: true, w: W_FINE });
    sg.text("SCHIFFE", 1.3, 0.16, 0.28, { align: "c", layer: 1, color: C.white, kind: L_MARK, w: 0.055 });
  });
}

/** A weeping willow: a trunk and a crown that hangs. */
function willow(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.pole([x, y, 0], [x, y, 2.6], 0.3, C.trunk);
    const cd = pen.card(x, y, 2.3);
    cd.ellipse(0, 1.2, 1.9, 1.3, C.leaf3, { outline: true, w: 0.1, sway: 0.35, layer: 1, seg: 14 });
    for (let k = 0; k < 9; k++) {
      const a = -1.6 + k * 0.4;
      cd.line(
        [
          [a, 1.1 - Math.abs(a) * 0.25],
          [a * 1.08, 0.2],
          [a * 1.1, -0.9 - (k % 3) * 0.25],
        ],
        { w: 0.13, color: k % 2 ? C.leaf2 : C.leaf, kind: L_MARK, sway: 0.5, wobble: 0.3, layer: 2 },
      );
    }
  });
}

// ---------------------------------------------------------------- the place

export const museumsinsel: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(MID, 21.5, 1.08);

  // the ground: the Lustgarten's lawn, the street across the island, the grass of the southern point
  c.early(() => {
    const g = pen.floor(0, 1);
    for (const [x0, x1] of [
      [1.5, MID - 2.7],
      [MID + 2.7, W - 1.5],
    ]) {
      g.rect(x0, 23.0, x1, AX - 2.9, C.grass, { outline: true, w: W_THIN });
      pen.floor(0, 2).ticks(x0 + 0.2, 23.2, x1 - 0.2, AX - 3.1, { n: 26, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    }
    // gravel round the fountain and up to the steps
    g.rect(MID - 2.7, 22.7, MID + 2.7, AX - 2.9, C.path, { layer: 1 });
    // the street
    g.rect(0.7, AX - 2.5, W - 0.7, AX + 2.5, C.plaza, { layer: 1 });
    g.seg(0.7, AX - 2.5, W - 0.7, AX - 2.5, { w: 0.06, color: C.stoneDark, kind: L_MARK, layer: 2 });
    g.seg(0.7, AX + 2.5, W - 0.7, AX + 2.5, { w: 0.06, color: C.stoneDark, kind: L_MARK, layer: 2 });
    for (let x = 2; x < W - 1; x += 2.4) g.seg(x, AX - 2.4, x, AX + 2.4, { w: 0.05, color: C.stoneDark, kind: L_MARK, wobble: 0.3, layer: 2 });
    // the park on the point: grass in the shape of the island's end
    const lawn: V2[] = [
      [1.6, AX + 3.1],
      [W - 1.6, AX + 3.1],
      [W - 1.6, L - ISLAND.tipS - 0.4],
    ];
    for (let k = 1; k < 10; k++) {
      const t = (k / 10) * Math.PI;
      lawn.push([MID + Math.cos(t) * (MID - 1.6), L - ISLAND.tipS - 0.4 + Math.sin(t) * (ISLAND.tipS - 1.4)]);
    }
    lawn.push([1.6, L - ISLAND.tipS - 0.4]);
    g.poly(lawn, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(2, AX + 3.4, W - 2, L - 2.6, {
      n: 50,
      len: 0.42,
      ang: 0.9,
      jit: 0.5,
      color: C.grassDark,
      w: 0.06,
      inside: (a, b) => b < L - ISLAND.tipS || Math.hypot((a - MID) / (MID - 2), (b - (L - ISLAND.tipS)) / (ISLAND.tipS - 1.9)) < 1,
    });
    // a path down the middle to the point
    g.line(
      [
        [MID, AX + 3.1],
        [MID - 0.4, AX + 7],
        [MID + 0.2, L - 2.2],
      ],
      { w: 1.3, color: C.path, kind: L_MARK, wobble: 0.4, layer: 1 },
    );
  });

  bode(c);
  dom(c);

  // ---- the Lustgarten
  fountain(pen, MID, 25.5, 1.55, 2.3);
  granitBowl(pen, 4.1, 25.3);
  for (const [x, y] of [
    [1.9, 22.6],
    [W - 1.9, 22.6],
    [1.9, AX - 2.75],
    [W - 1.9, AX - 2.75],
  ]) {
    lamp(pen, x, y, 0, 3.0);
  }
  // people in the sun on the grass
  picnic(pen, rng, 13.3, 24.3, 0, 3);
  picnic(pen, rng, 15.5, 26.7, 0, 2);
  // students with their books, lying about
  for (const [x, y, fl] of [
    [13.1, 26.9, false],
    [16.1, 23.5, true],
    [12.2, 23.4, true],
  ] as [number, number, boolean][]) {
    person(pen, x, y, -0.2, randomLook(rng), "sit", fl);
    pen.floor(0, 3).rect(x + (fl ? -0.75 : 0.45), y + 0.25, x + (fl ? -0.4 : 0.8), y + 0.5, rng.pick([C.white, C.yellow, C.sky]), { outline: true, w: W_FINE });
  }
  // the granite bowl has the west lawn to itself; three have come to look at it, one of them explaining
  person(pen, 7.1, 23.6, 0, randomLook(rng), "wave", true);
  person(pen, 7.0, 26.6, 0, randomLook(rng), "stand", true);
  person(pen, 6.5, 27.3, 0, randomLook(rng), "stand", true, 0.72);
  // tourists on the cathedral's steps, one photographing the other
  const stepZ = 0.6;
  person(pen, MID - 1.9, DY1 + 0.4, stepZ, randomLook(rng), "sit", false);
  person(pen, MID - 1.2, DY1 + 0.45, stepZ, randomLook(rng), "sit", true);
  person(pen, MID + 1.8, DY1 + 0.5, stepZ, randomLook(rng), "cheer", true);
  person(pen, MID + 2.4, DY1 + 2.0, 0, { ...randomLook(rng), top: C.orange }, "wave", false);
  person(pen, MID - 3.4, DY1 + 1.9, 0, randomLook(rng), "stand", false);
  person(pen, MID - 4.1, DY1 + 2.0, 0, randomLook(rng), "stand", true, 0.72);
  // a school class in a crocodile, on its way in
  const teacher: Look = { ...randomLook(rng), top: C.teal, hat: null };
  person(pen, MID + 4.3, DY1 + 1.5, 0, teacher, "wave", false);
  queue(pen, rng, MID + 5.1, DY1 + 1.6, 5, 1, 0.12, 0, () => ({ ...randomLook(rng), top: C.yellow }));

  // the frisbee players (the disc itself flies: see the movers)
  const fa: V2 = [11.3, 25.6];
  const fb: V2 = [16.0, 24.4];
  person(pen, fa[0], fa[1], 0, randomLook(rng), "cheer", false);
  person(pen, fb[0], fb[1], 0, randomLook(rng), "wave", true);

  // ---- the point, south of the street
  for (const [x, y, kind] of [
    [3.2, AX + 4.6, "elm"],
    [14.9, AX + 4.4, "elm"],
    [15.6, AX + 8.2, "round"],
    [2.9, AX + 8.6, "round"],
    [12.3, L - 3.6, "round"],
  ] as [number, number, "elm" | "round"][]) {
    tree(pen, rng, x, y, { kind, h: kind === "elm" ? 2.5 : 1.9, r: kind === "elm" ? 1.6 : 1.3 });
  }
  willow(pen, 5.4, L - 4.6);
  lamp(pen, MID + 1.3, AX + 3.4, 0, 3.0);
  lamp(pen, MID - 1.2, L - 3.2, 0, 3.0);
  // benches under the limes
  bench(pen, 4.9, AX + 5.6, 180);
  person(pen, 4.5, AX + 5.4, 0.3, randomLook(rng), "sit", false);
  person(pen, 5.35, AX + 5.4, 0.3, randomLook(rng), "sit", true);
  bench(pen, 13.4, AX + 5.4, 180);
  person(pen, 13.4, AX + 5.2, 0.3, randomLook(rng), "sit", true);
  // ice cream, with the queue it deserves in this weather
  eisCart(pen, 7.0, AX + 4.3);
  person(pen, 6.3, AX + 3.6, 0, { ...randomLook(rng), top: C.white, hat: C.white }, "stand", false);
  queue(pen, rng, 7.4, AX + 5.4, 4, 0.25, 1);
  // tickets for the boats
  kiosk(pen, 10.6, AX + 3.3);
  queue(pen, rng, 12.0, AX + 5.7, 3, 0.35, 1);

  // the painter at his easel, painting the cathedral (and getting the dome a little big)
  const ex = 9.9;
  const ey = AX + 9.2;
  pen.obj(() => {
    for (const o of [-0.45, 0.45]) {
      pen.stroke(
        [
          [ex + o, ey + 0.2, 0],
          [ex, ey, 1.9],
        ],
        { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    pen.stroke(
      [
        [ex, ey - 0.5, 0],
        [ex, ey, 1.9],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    const cv = pen.card(ex, ey + 0.1, 0.85);
    cv.rect(-0.6, 0, 0.6, 0.95, C.white, { outline: true, w: W_FINE, layer: 1 });
    cv.rect(-0.42, 0.1, 0.42, 0.4, C.domStone, { layer: 2, grain: 0.4 });
    cv.ellipse(0, 0.48, 0.3, 0.32, C.copper, { layer: 3, grain: 0.3, seg: 8, a0: 0, a1: Math.PI });
    cv.seg(0, 0.8, 0, 0.9, { w: 0.05, color: C.gold, kind: L_MARK, wobble: 0, layer: 4 });
  });
  const painter: Look = { skin: [246, 211, 184], hair: [217, 213, 207], top: C.blue, legs: C.charcoal, long: false, hat: C.charcoal };
  person(pen, ex + 1.0, ey + 0.35, 0, painter, "wave", true);
  person(pen, ex + 2.2, ey + 0.9, 0, randomLook(rng), "stand", true, 0.72);

  // the cellist and the few who have stopped to listen (his bow arm is a mover)
  const cx = 4.6;
  const cyy = AX + 10.4;
  const cellist: Look = { skin: [211, 154, 108], hair: [43, 32, 25], top: C.black, legs: C.black, long: true, hat: null };
  pen.obj(() => pen.box(cx - 0.25, cyy - 0.25, 0, 0.5, 0.5, 0.42, C.woodDark, { w: W_FINE }));
  person(pen, cx, cyy, 0.2, cellist, "sit", false);
  pen.obj(() => {
    const cd = pen.card(cx + 0.55, cyy + 0.12, 0);
    cd.ellipse(0, 0.62, 0.3, 0.44, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 10 });
    cd.ellipse(0, 1.0, 0.22, 0.26, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 8 });
    cd.bar(0, 1.2, 0.02, 2.0, 0.08, C.woodDark, { layer: 5 });
    cd.bar(0, 0.05, 0, 0.2, 0.05, C.black, { layer: 5 });
  });
  pen.obj(() => pen.box(cx + 1.0, cyy + 0.75, 0, 0.5, 0.36, 0.1, C.black, { w: W_FINE }));
  for (const [x, y, fl] of [
    [6.9, cyy + 0.2, true],
    [7.3, cyy + 1.4, true],
    [6.2, cyy + 2.1, true],
    [3.6, cyy + 2.2, false],
  ] as [number, number, boolean][]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), fl, rng.chance(0.25) ? 0.72 : 1);
  }

  // two anglers on the very point, their rods out over the rail
  const anglers: [number, number, number, number][] = [
    [MID - 0.6, L - 1.75, -0.5, 2.9],
    [MID + 3.6, L - 2.9, 1.6, 2.5],
  ];
  for (const [x, y, dx, dy] of anglers) {
    person(pen, x, y, 0, { ...randomLook(rng), hat: C.green }, "stand", dx > 0);
    pen.obj(() => {
      const tip: V3 = [x + dx, y + dy, 3.1];
      pen.stroke(
        [
          [x + (dx > 0 ? 0.35 : -0.35), y + 0.05, 1.2],
          [x + dx * 0.55, y + dy * 0.55, 2.5],
          tip,
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
      pen.stroke([tip, [tip[0] + 0.1, tip[1] + 0.25, c.waterZ + 0.05]], { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0, alpha: 0.8 });
      pen.card(tip[0] + 0.1, tip[1] + 0.25, c.waterZ).circle(0, 0.12, 0.12, C.red, { seg: 6, grain: 0, outline: true, w: W_FINE });
    });
    pen.obj(() => pen.cyl(x + (dx > 0 ? -0.7 : 0.7), y - 0.2, 0, 0.24, 0.42, C.blue, { seg: 7 }));
  }
  // and the couple who came for the view of the river
  person(pen, 14.2, L - 6.6, 0, randomLook(rng), "stand", false);
  person(pen, 14.9, L - 6.5, 0, randomLook(rng), "stand", true);

  // ---- what moves
  // round the Lustgarten, keeping to the edge of the grass
  const garden = stroll(c, [
    [2.0, 22.75],
    [W - 2.0, 22.75],
    [W - 2.0, AX - 3.25],
    [MID + 3.0, AX - 3.25],
    [MID + 3.0, 23.3],
    [MID - 3.0, 23.3],
    [MID - 3.0, AX - 3.25],
    [2.0, AX - 3.25],
  ]);
  for (let k = 0; k < 6; k++) c.movers.push(walker(garden, rng, c.done + rng.range(0, 1)));

  // the frisbee, there and back
  const disc = makeSprite((p) => {
    const cd = p.card(0, 0, 0);
    cd.ellipse(0, 0, 0.34, 0.11, C.red, { outline: true, w: W_FINE, seg: 10 });
  });
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const per = 2.6;
    const tt = (m.t - c.done) / per;
    const leg = Math.floor(tt) & 1;
    const u = tt - Math.floor(tt);
    // it leaves a hand, hangs, and is caught: nobody holds it for long
    const k = u < 0.12 ? 0 : u > 0.88 ? 1 : (u - 0.12) / 0.76;
    const s = leg ? 1 - k : k;
    m.put(disc, c.ox + fa[0] + (fb[0] - fa[0]) * s, c.oy + fa[1] + (fb[1] - fa[1]) * s, c.oz + 1.9 + Math.sin(Math.PI * k) * 1.5, c.done);
  });

  // the cellist's bow
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(c.ox + cx, c.oy + cyy, c.oz + 1, 6)) return;
    const s = Math.sin(m.t * 3.1);
    const cd = m.pen.card(c.ox + cx + 0.55, c.oy + cyy + 0.14, c.oz);
    cd.seg(-0.75 + s * 0.3, 0.86 - s * 0.06, 0.55 + s * 0.3, 0.98 + s * 0.06, { w: 0.05, color: C.cream, kind: L_BAR, wobble: 0 });
    cd.bar(-0.42, 1.24, -0.6 + s * 0.3, 0.9 - s * 0.05, 0.15, cellist.top);
  });

  // the bells in the two front towers, and in the east face of the nearer one: they hang still until the camera comes
  const bells: V3[] = [
    [DX0 + TOWER / 2, DY1 + 0.04, 11.75],
    [DX1 - TOWER / 2, DY1 + 0.04, 11.75],
    [DX1 + 0.04, DY1 - TOWER / 2, 11.75],
  ];
  const bronze: RGB = [196, 150, 74];
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(c.ox + MID, c.oy + DY1, c.oz + 12, 12)) return;
    const s = c.stay();
    const rings = s ? [s.at + 0.2] : [c.done + 1.2];
    let since = Infinity;
    for (const r of rings) if (m.t >= r) since = Math.min(since, m.t - r);
    bells.forEach((b, k) => {
      const ang = since === Infinity ? 0 : 0.62 * Math.exp(-since / 4.2) * Math.sin(since * 5.4 + k * 2.1);
      const cs = Math.cos(ang);
      const sn = Math.sin(ang);
      // a bell hung from its crown: the shape swings about the top point
      const shape: V2[] = [
        [-0.13, 0],
        [0.13, 0],
        [0.2, -0.55],
        [0.44, -0.98],
        [-0.44, -0.98],
        [-0.2, -0.55],
      ];
      const cd = m.pen.card(c.ox + b[0], c.oy + b[1], c.oz + b[2]);
      cd.poly(
        shape.map(([a, bb]) => [a * cs - bb * sn, a * sn + bb * cs] as V2),
        bronze,
        { outline: true, w: W_FINE, layer: 3, grain: 0.3 },
      );
      cd.circle(1.03 * sn, -1.03 * cs, 0.1, C.charcoal, { seg: 6, layer: 4, grain: 0 });
    });
  });

  // the pigeons: they idle round the lantern, and when the bells start they are off, up and round the dome
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  const zTop = BODY + DRUM_H + DOME_H;
  for (let k = 0; k < 10; k++) {
    const sp = (0.62 + 0.07 * (k % 5)) * (k % 2 ? -1 : 1);
    const ph = k * 1.7;
    const born = c.done + k * 0.12;
    c.movers.push((m) => {
      const s = c.stay();
      const start = (s ? s.at + 0.25 : c.done + 1.3) + k * 0.06;
      const since = m.t - start;
      // 0 while they idle, rising to 1 over the two seconds after the first stroke
      const u = since <= 0 ? 0 : Math.min(1, since / 2.2);
      const e = u * u * (3 - 2 * u);
      // they fly faster once they are up: the extra distance flown is the integral of e, so the turn never jumps
      const extra = since <= 0 ? 0 : 2.2 * (u * u * u - (u * u * u * u) / 2) + Math.max(0, since - 2.2);
      const a = ph + sp * (m.t + 0.9 * extra);
      const r = 2.3 + (k % 3) * 0.5 + e * (3.6 + (k % 4) * 1.1);
      const z = zTop - 1.2 + (k % 3) * 0.5 + e * (3.4 + (k % 5) * 1.0) + Math.sin(m.t * 0.9 + ph) * 0.5;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * (5 + e * 3) + ph) & 1;
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + MID + Math.cos(a) * r, c.oy + CY + Math.sin(a) * r * 0.9, c.oz + z, born);
    });
  }
};
