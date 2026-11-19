// Brandenburger Tor: the Gate at the western end of Pariser Platz, the
// Quadriga on top of it looking east down Unter den Linden, the Adlon and the
// French embassy along the square, the limes of the boulevard running off to
// the Schlossbrücke, and in front of the columns a man making soap bubbles
// for whoever will chase them. The film ends on him.
//
// East is local +x (the lower right of the page), so the Gate's passages run
// along x and the camera sees its city side. The axis of the whole city is
// the line y = AX: the promenade the city's walkers stroll from the Gate to
// the island keeps to it, so nothing stands between y = AX - 2.5 and AX + 2.5
// east of the Gate.

import { RGB, Rng, V2, V3, hash1, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { buddyBear, dog, flagOf, fountain, imbiss, litfass, queue } from "../berlin";
import { uSign } from "../bridges";
import { AXIS_Y, BLOCK, QUAY, ROW_Y } from "../city";
import { W_FINE, W_THIN, Look, bench, bikeRow, cafeTable, flowerBed, lamp, person, randomLook, tree, windowAt, windowGrid } from "../kit";
import { Route, makeSprite, rounded, walker } from "../motion";
import { C, TRABI, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** The axis, in the block's own coordinates. */
const AX = AXIS_Y - ROW_Y[1];
/** The Gate stands across the axis, here. */
const GX = 11;

/** Where the final close-up looks: the bubble man and his audience, under the columns. */
export const gateSpot: [number, number, number] = [16.2, 27.2, 2.6];

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

// ---------------------------------------------------------------- the Quadriga

/** A horse seen side on, on a card, head to the right: the four of the Quadriga, and Old Fritz's. */
function horse(cd: Plane, col: RGB, s = 1): void {
  cd.bar(-0.55 * s, 0.95 * s, -0.66 * s, 0.05 * s, 0.17 * s, col);
  cd.bar(-0.3 * s, 0.95 * s, -0.26 * s, 0.05 * s, 0.17 * s, col);
  cd.bar(0.42 * s, 0.95 * s, 0.46 * s, 0.05 * s, 0.17 * s, col);
  cd.bar(0.62 * s, 1.02 * s, 0.98 * s, 0.68 * s, 0.16 * s, col);
  cd.bar(0.98 * s, 0.68 * s, 0.86 * s, 0.36 * s, 0.13 * s, col);
  cd.bar(-0.78 * s, 1.3 * s, -1.1 * s, 0.72 * s, 0.14 * s, col);
  cd.ellipse(0, 1.15 * s, 0.82 * s, 0.42 * s, col, { outline: true, w: W_FINE, layer: 1, seg: 12 });
  cd.bar(0.58 * s, 1.32 * s, 0.94 * s, 1.95 * s, 0.36 * s, col, { layer: 2 });
  cd.bar(0.94 * s, 1.97 * s, 1.3 * s, 1.72 * s, 0.26 * s, col, { layer: 2 });
  cd.bar(0.9 * s, 2.06 * s, 0.88 * s, 2.24 * s, 0.08 * s, col, { layer: 2 });
}

/**
 * Victoria in her chariot behind four horses abreast, facing east (local +x),
 * standing on a base whose top is at z. Hammered copper, long since green.
 */
function quadriga(pen: Pen, x0: number, y0: number, z0: number): void {
  const green = C.copper;
  const dark = C.copperDark;
  // (drawn a quarter over life size: she has to read from across the city)
  pen.push(x0, y0, z0, 0, 1.25);
  const x = 0;
  const y = 0;
  const z = 0;
  // the chariot and the goddess, behind the team
  pen.obj(() => {
    const cd = pen.card(x - 1.5, y, z);
    for (const o of [-0.18, 0.18]) cd.circle(0.1 + o, 0.55, 0.52, null, { ink: C.ink, w: 0.1, seg: 10 });
    cd.poly(
      [
        [-0.55, 0.45],
        [0.75, 0.45],
        [0.95, 1.05],
        [0.6, 1.3],
        [-0.55, 1.3],
      ],
      dark,
      { outline: true, w: W_FINE, layer: 1 },
    );
    // her wings, her robe, her head
    cd.poly(
      [
        [-0.2, 2.2],
        [-1.25, 3.3],
        [-1.0, 2.2],
        [-0.45, 1.5],
      ],
      green,
      { outline: true, w: W_FINE, layer: 2 },
    );
    cd.poly(
      [
        [0.1, 2.25],
        [-0.55, 3.55],
        [-0.15, 2.5],
      ],
      green,
      { outline: true, w: W_FINE, layer: 2 },
    );
    cd.poly(
      [
        [-0.42, 1.2],
        [0.36, 1.2],
        [0.26, 2.5],
        [-0.28, 2.5],
      ],
      green,
      { outline: true, w: W_FINE, layer: 3 },
    );
    cd.circle(0, 2.75, 0.27, green, { outline: true, w: W_FINE, layer: 4, seg: 9 });
    // the staff: an oak wreath round the iron cross, and the eagle perched on it
    cd.bar(0.22, 2.2, 0.62, 2.6, 0.13, green, { layer: 4 });
    cd.bar(0.62, 1.3, 0.62, 4.2, 0.09, green, { layer: 4 });
    cd.circle(0.62, 4.55, 0.4, null, { ink: dark, w: 0.13, seg: 10, layer: 4 });
    cd.seg(0.62, 4.3, 0.62, 4.8, { w: 0.1, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 5 });
    cd.seg(0.4, 4.57, 0.84, 4.57, { w: 0.1, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 5 });
    cd.poly(
      [
        [0.62, 4.95],
        [0.2, 5.35],
        [0.5, 5.2],
        [0.62, 5.45],
        [0.74, 5.2],
        [1.04, 5.35],
      ],
      green,
      { outline: true, w: W_FINE, layer: 5 },
    );
  });
  // the four horses, the far one first so the near ones overlap it
  for (const o of [-1.35, -0.45, 0.45, 1.35]) {
    pen.obj(() => horse(pen.card(x, y + o, z), green, 1.0), 0.08 + (o + 1.35) * 0.04);
  }
  pen.pop();
}

// ---------------------------------------------------------------- the Gate

/** Six walls with a column at each end, five passages between them, an entablature, an attic, and the Quadriga. */
function gate(c: BlockCtx): void {
  const { pen } = c;
  const st = C.sandstone;
  const lt = C.sandstoneLight;
  const dk = C.sandstoneDark;
  const H = 8.4;
  // the walls between the passages stand at these y; the middle passage is the widest (it was the king's)
  const fins = [-5.85, -3.65, -1.45, 1.45, 3.65, 5.85].map((o) => AX + o);
  c.early(() => {
    pen.box(GX - 2.6, AX - 6.9, 0, 5.2, 13.8, 0.16, lt, { w: W_THIN });
  });
  pen.obj(() => {
    for (const y of fins) {
      pen.box(GX - 1.5, y - 0.36, 0.16, 3.0, 0.72, H, st);
      // fluted Doric columns at both ends; only the eastern ones can be seen
      for (const x of [GX - 1.9, GX + 1.9]) {
        pen.cyl(x, y, 0.16, 0.5, 0.3, lt, { seg: 8 });
        pen.cyl(x, y, 0.46, 0.43, H - 0.75, st, { seg: 8, r2: 0.38 });
        pen.box(x - 0.52, y - 0.52, H - 0.29, 1.04, 1.04, 0.45, lt, { w: W_THIN });
        if (x > GX) {
          const cf = pen.card(x, y, 0.5);
          for (const a of [-0.2, 0, 0.2]) cf.seg(a, 0.1, a * 0.9, H - 1.0, { w: 0.04, color: dk, kind: L_MARK, wobble: 0.2, layer: 1 });
        }
      }
    }
    // floodlights between the columns, for the night
    for (const y of [AX - 4.75, AX - 2.55, AX, AX + 2.55, AX + 4.75]) {
      pen.stroke(
        [
          [GX + 2.2, y, 0.3],
          [GX + 2.2, y, 5.5],
        ],
        { w: 1.5, kind: L_LIGHT, wobble: 0, alpha: 0.32 },
      );
    }
  });
  // the entablature: architrave, a frieze of triglyphs, the cornice
  pen.obj(() => {
    pen.box(GX - 2.25, AX - 6.5, H + 0.16, 4.5, 13.0, 1.55, st, { glow: 0.25 });
    const f = pen.wall("x+", GX - 2.25, AX - 6.5, H + 0.16, 4.5, 13.0);
    f.seg(0, 0.62, 13, 0.62, { w: 0.06 });
    for (let a = 0.35; a < 12.8; a += 0.72) f.rect(a, 0.72, a + 0.3, 1.42, dk, { grain: 0.5 });
    const g = pen.wall("y+", GX - 2.25, AX - 6.5, H + 0.16, 4.5, 13.0);
    g.seg(0, 0.62, 4.5, 0.62, { w: 0.06 });
    for (let a = 0.35; a < 4.3; a += 0.72) g.rect(a, 0.72, a + 0.3, 1.42, dk, { grain: 0.5 });
    pen.box(GX - 2.5, AX - 6.75, H + 1.71, 5.0, 13.5, 0.32, lt, { glow: 0.25 });
  }, 0.16);
  // the attic, with its relief of Peace arriving, and the steps the Quadriga stands on
  pen.obj(() => {
    pen.box(GX - 1.9, AX - 5.5, H + 2.03, 3.8, 11.0, 1.55, st, { glow: 0.25 });
    const f = pen.wall("x+", GX - 1.9, AX - 5.5, H + 2.03, 3.8, 11.0);
    f.rect(0.7, 0.28, 10.3, 1.25, lt, { outline: true, w: W_FINE, grain: 0.5 });
    f.ticks(0.9, 0.4, 10.1, 1.1, { n: 34, len: 0.7, ang: Math.PI / 2, jit: 0.25, color: dk, w: 0.09, layer: 1 });
    pen.box(GX - 2.05, AX - 5.65, H + 3.58, 4.1, 11.3, 0.22, lt);
    pen.box(GX - 1.85, AX - 3.6, H + 3.8, 3.75, 7.2, 0.5, st);
  }, 0.3);
  quadriga(pen, GX + 0.55, AX, H + 4.3);

  // the two gatehouses, each with a little portico towards the square, joined to the Gate by a low wing
  for (const side of [-1, 1]) {
    const y0 = side < 0 ? AX - 11.6 : AX + 7.25;
    const d = 4.35;
    pen.obj(() => {
      pen.box(GX - 2.3, y0, 0, 4.2, d, 5.5, st);
      const f = pen.wall("x+", GX - 2.3, y0, 0, 4.2, d);
      f.rect(d / 2 - 0.6, 0, d / 2 + 0.6, 2.7, C.door, { outline: true, w: W_FINE });
      windowAt(f, 0.5, 1.4, 1.3, 3.2, true, lt);
      windowAt(f, d - 1.3, 1.4, d - 0.5, 3.2, false, lt);
      const g = pen.wall("y+", GX - 2.3, y0, 0, 4.2, d);
      windowAt(g, 0.7, 1.4, 1.6, 3.2, false, lt);
      windowAt(g, 2.5, 1.4, 3.4, 3.2, true, lt);
      for (const k of [0.45, 1.6, d - 1.6, d - 0.45]) {
        pen.cyl(GX + 2.55, y0 + k, 0, 0.26, 4.7, lt, { seg: 7, r2: 0.23 });
      }
      pen.box(GX + 1.9, y0, 4.7, 1.0, d, 0.8, st);
      // the wing between gatehouse and Gate
      const wy = side < 0 ? y0 + d : AX + 6.5;
      pen.box(GX - 1.4, wy, 0, 2.8, side < 0 ? AX - 6.5 - (y0 + d) : y0 - (AX + 6.5), 5.0, st);
    });
    pen.obj(() => pen.gable(GX - 2.5, y0 - 0.2, 5.5, 5.6, d + 0.4, 1.35, "x", C.zinc, { gable: lt }), 0.18);
  }
}

// ---------------------------------------------------------------- round the square

/** One of the two parterres of Pariser Platz: lawn inside a clipped hedge, beds at the corners, a fountain. */
function parterre(c: BlockCtx, x0: number, y0: number, x1: number, y1: number): void {
  const { pen, rng } = c;
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(x0, y0, x1, y1, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.3, { n: 46, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
  });
  pen.obj(() => {
    for (const [hx, hy, hw, hd] of [
      [x0, y0, x1 - x0, 0.45],
      [x0, y1 - 0.45, x1 - x0, 0.45],
      [x0, y0, 0.45, y1 - y0],
      [x1 - 0.45, y0, 0.45, y1 - y0],
    ]) {
      pen.box(hx, hy, 0, hw, hd, 0.5, C.hedge, { w: W_THIN });
    }
  });
  for (const [bx, by] of [
    [x0 + 0.9, y0 + 0.9],
    [x1 - 2.9, y0 + 0.9],
    [x0 + 0.9, y1 - 2.3],
    [x1 - 2.9, y1 - 2.3],
  ]) {
    flowerBed(pen, rng, bx, by, 2.0, 1.4, TULIP.slice(0, 4));
  }
  fountain(pen, (x0 + x1) / 2, (y0 + y1) / 2, 1.7, 2.1);
}

/** The Hotel Adlon: six floors of cream stone under a green copper roof, a canopy, a carpet and a doorman. */
function adlon(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen, rng } = c;
  const h = 11.2;
  const wall = C.cream;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, wall);
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.rect(0, 0, w, 2.7, C.sandstone, { grain: 0.6 });
    f.rect(0, 2.7, w, 2.95, C.sandstoneLight, { grain: 0.4, layer: 1 });
    // tall arched windows downstairs, either side of the door
    const n0 = Math.floor((w - 3.6) / 2 / 1.7);
    for (let k = 0; k < n0; k++) {
      for (const a of [0.5 + k * 1.7, w - 1.6 - k * 1.7]) {
        f.rect(a, 0.5, a + 1.1, 2.3, C.glassLight, { outline: true, w: W_FINE, glow: 0.85, layer: 1 });
      }
    }
    f.rect(w / 2 - 0.9, 0, w / 2 + 0.9, 2.4, C.charcoal, { outline: true, w: W_THIN, layer: 1, glow: 0.5 });
    windowGrid(f, rng, 0.4, 3.3, w - 0.4, h - 0.6, Math.round(w / 1.45), 4, { lit: 0.7, trim: C.white, fillA: 0.55, fillB: 0.66 });
    f.rect(0, h - 0.5, w, h, C.sandstoneLight, { grain: 0.4, layer: 1 });
    const g = pen.wall("x+", x0, y0, 0, w, d);
    g.rect(0, 0, d, 2.7, C.sandstone, { grain: 0.6 });
    windowGrid(g, rng, 0.4, 3.3, d - 0.4, h - 0.6, Math.round(d / 1.6), 4, { lit: 0.6, trim: C.white, fillA: 0.55, fillB: 0.66 });
  });
  // the mansard, with its dormers, and the name along the eaves
  pen.obj(() => {
    pen.hip(x0 - 0.15, y0 - 0.15, h, w + 0.3, d + 0.3, 2.3, C.copper, { inset: 2.2 });
    for (let a = 1.4; a < w - 1; a += 2.3) {
      pen.box(x0 + a - 0.45, y0 + d - 1.25, h + 0.25, 0.9, 1.0, 0.9, wall, { top: C.copper, w: W_FINE });
      pen.wall("y+", x0 + a - 0.45, y0 + d - 1.25, h + 0.25, 0.9, 1.0).rect(0.18, 0.15, 0.72, 0.75, C.glass, { glow: rng.chance(0.5) ? 1 : 0, grain: 0.4 });
    }
    const sg = pen.plane([x0 + w / 2 - 2.6, y0 + d + 0.06, h - 0.02], [1, 0, 0], [0, 0, 1], 2, true);
    sg.text("ADLON", 2.6, 0.12, 0.62, { align: "c", color: C.gold, kind: L_MARK, w: 0.1, wobble: 0.2 });
  }, 0.16);
  flagOf(pen, x0 + 2, y0 + d - 0.6, h + 0.9, 3.4, "de", 0.9);
  flagOf(pen, x0 + w - 2.6, y0 + d - 0.6, h + 0.9, 3.4, "eu", 0.9);
  // the canopy, the carpet, the doorman in his top hat, a guest with a trunk
  const mx = x0 + w / 2;
  const front = y0 + d;
  pen.obj(() => {
    pen.floor(0, 2).rect(mx - 0.8, front, mx + 0.8, front + 3.1, C.redDark, { outline: true, w: W_FINE, grain: 0.5 });
    pen.box(mx - 1.6, front, 2.75, 3.2, 1.7, 0.18, C.copperDark, { w: W_THIN });
    for (const o of [-1.45, 1.45]) pen.pole([mx + o, front + 1.55, 0], [mx + o, front + 1.55, 2.75], 0.09, C.gold);
    for (const o of [-2.3, 2.3]) {
      pen.cyl(mx + o, front + 0.6, 0, 0.36, 0.6, C.sandstoneLight, { seg: 8 });
      tree(pen, rng, mx + o, front + 0.6, { kind: "bush", z: 0.6, r: 0.5, color: C.hedge });
    }
  });
  const doorman: Look = { skin: rng.pick([C.cream, C.ochre]), hair: C.black, top: C.redDark, legs: C.charcoal, long: false, hat: C.black };
  person(pen, mx + 1.25, front + 0.9, 0, { ...doorman, skin: [238, 187, 150] }, "stand", true);
  person(pen, mx - 0.35, front + 2.4, 0, randomLook(rng), "walkA", false);
  pen.box(mx - 1.15, front + 2.2, 0, 0.5, 0.36, 0.72, C.brickBrown, { w: W_FINE });
}

/** The French embassy: pale stone, deep slit windows, the tricolour over the door. */
function embassy(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen, rng } = c;
  const h = 9.6;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.sandstoneLight, { top: C.stone });
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.rect(0, 0, w, 2.9, C.sandstone, { grain: 0.6 });
    for (let a = 0.7; a < w - 1; a += 1.5) {
      f.rect(a, 3.5, a + 0.75, h - 0.7, C.glass, { outline: true, w: W_FINE, glow: rng.chance(0.55) ? 0.9 : 0, layer: 1 });
      if (Math.abs(a + 0.4 - w / 2) > 1.2) f.rect(a, 0.5, a + 0.75, 2.4, C.glass, { outline: true, w: W_FINE, glow: 0.5, layer: 1 });
    }
    f.rect(w / 2 - 1.0, 0, w / 2 + 1.0, 2.6, C.doorBlue, { outline: true, w: W_THIN, layer: 1 });
    const g = pen.wall("x+", x0, y0, 0, w, d);
    for (let a = 0.9; a < d - 1; a += 1.6) g.rect(a, 3.5, a + 0.75, h - 0.7, C.glass, { outline: true, w: W_FINE, glow: rng.chance(0.5) ? 0.9 : 0, layer: 1 });
  });
  // the tricolour, hung out over the door
  pen.obj(() => {
    const top = 5.4;
    pen.pole([x0 + w / 2, y0 + d, 3.4], [x0 + w / 2, y0 + d + 1.5, top], 0.08, C.white);
    const cd = pen.card(x0 + w / 2, y0 + d + 1.5, top - 1.05);
    const bands: RGB[] = [C.blueDark, C.white, C.red];
    bands.forEach((rgb, i) => cd.rect(0.05 + i * 0.5, 0, 0.05 + (i + 1) * 0.5, 1.0, rgb, { sway: 0.4, grain: 0.5, layer: 1 }));
    cd.loop(
      [
        [0.05, 0],
        [1.55, 0],
        [1.55, 1.0],
        [0.05, 1.0],
      ],
      { w: W_FINE, sway: 0.4, layer: 2 },
    );
  }, 0.15);
}

/** A parked Trabant, nose along local +x: the safari sets off from here every hour. */
function trabi(pen: Pen, x: number, y: number, rot: number, col: RGB): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.box(-1.45, -0.72, 0, 2.9, 1.44, 0.3, C.black, { edges: false });
  pen.box(-1.75, -0.8, 0.3, 3.5, 1.6, 0.62, col);
  pen.box(-1.05, -0.7, 0.92, 1.9, 1.4, 0.56, C.glass, { top: C.white });
  pen.end();
  pen.pop();
}

/** Somebody inside a bear suit, waving at the tourists for a euro a photograph. */
function bearSuit(pen: Pen, x: number, y: number, flip: boolean): void {
  const cd = pen.card(x, y, 0, flip);
  const fur: RGB = [142, 98, 62];
  pen.begin();
  cd.bar(-0.2, 0.75, -0.22, 0.1, 0.34, fur);
  cd.bar(0.2, 0.75, 0.22, 0.1, 0.34, fur);
  cd.ellipse(0, 1.2, 0.52, 0.62, fur, { outline: true, w: W_FINE, layer: 1, seg: 12 });
  cd.ellipse(0, 1.1, 0.28, 0.34, [206, 170, 128], { layer: 2, seg: 10, grain: 0.4 });
  cd.bar(-0.42, 1.45, -0.56, 0.9, 0.24, fur, { layer: 1 });
  cd.bar(0.42, 1.5, 0.78, 2.15, 0.24, fur, { layer: 1 });
  cd.circle(0, 2.05, 0.4, fur, { outline: true, w: W_FINE, layer: 3, seg: 10 });
  for (const e of [-0.3, 0.3]) cd.circle(e, 2.4, 0.14, fur, { outline: true, w: W_FINE, layer: 2, seg: 6 });
  cd.ellipse(0, 1.95, 0.17, 0.13, [206, 170, 128], { layer: 4, seg: 8, grain: 0.3 });
  for (const e of [-0.15, 0.15]) cd.seg(e, 2.12, e, 2.2, { w: 0.07, wobble: 0, layer: 5 });
  pen.end();
}

/** Frederick the Great on his horse, on a tall plinth in the middle of the promenade. */
function oldFritz(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.box(x - 1.3, y - 0.62, 0, 2.6, 1.24, 0.5, C.sandstoneDark, { w: W_THIN });
    pen.box(x - 1.05, y - 0.5, 0.5, 2.1, 1.0, 2.6, C.sandstone, { w: W_THIN });
    pen.box(x - 1.2, y - 0.6, 3.1, 2.4, 1.2, 0.25, C.sandstoneLight, { w: W_THIN });
    const f = pen.wall("y+", x - 1.05, y - 0.5, 0.5, 2.1, 1.0);
    f.ticks(0.2, 0.9, 1.9, 2.1, { n: 12, len: 0.6, ang: Math.PI / 2, jit: 0.3, color: C.sandstoneDark, w: 0.08 });
  });
  pen.obj(() => {
    const cd = pen.card(x - 0.1, y, 3.35);
    const bronze: RGB = [92, 118, 104];
    horse(cd, bronze, 1.05);
    // the king, in his tricorn, cloak flying
    cd.poly(
      [
        [-0.42, 1.5],
        [0.2, 1.5],
        [0.14, 2.45],
        [-0.3, 2.45],
      ],
      bronze,
      { outline: true, w: W_FINE, layer: 3 },
    );
    cd.poly(
      [
        [-0.3, 2.35],
        [-0.95, 1.75],
        [-0.42, 1.6],
      ],
      bronze,
      { outline: true, w: W_FINE, layer: 2 },
    );
    cd.circle(-0.06, 2.68, 0.24, bronze, { outline: true, w: W_FINE, layer: 4, seg: 8 });
    cd.poly(
      [
        [-0.42, 2.82],
        [0.34, 2.82],
        [-0.04, 3.1],
      ],
      bronze,
      { outline: true, w: W_FINE, layer: 5 },
    );
  }, 0.2);
}

/** A pigeon, wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

// ---------------------------------------------------------------- the place

export const brandenburgertor: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(25.5, 27.5, 1);

  // the ground: the square in pale stone, the promenade in gravel, the boulevard's wide pavements
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E, E, B - E, B - E, C.plaza);
    // Pariser Platz, in a slightly warmer stone, banded
    g.rect(GX + 2.9, 12.9, 30.2, B - E, C.sandstoneLight, { layer: 1, grain: 0.8 });
    for (let x = 16; x < 30; x += 2.8) g.seg(x, 13, x, B - E - 0.1, { w: 0.06, color: C.stoneDark, kind: L_MARK, wobble: 0.3, layer: 2 });
    // the promenade down the middle of Unter den Linden
    g.rect(30.2, AX - 2.5, B - QUAY, AX + 2.5, C.path, { layer: 1 });
    g.seg(30.2, AX - 2.5, B - QUAY, AX - 2.5, { w: 0.06, color: C.stoneDark, kind: L_MARK, layer: 2 });
    g.seg(30.2, AX + 2.5, B - QUAY, AX + 2.5, { w: 0.06, color: C.stoneDark, kind: L_MARK, layer: 2 });
    pen.floor(0, 2).ticks(E + 0.4, E + 0.4, B - E - 0.4, B - E - 0.4, {
      n: 150,
      len: 0.3,
      ang: -0.78,
      jit: 0.2,
      color: C.stoneDark,
      w: 0.06,
      inside: (a, b) => !(a > 30 && Math.abs(b - AX) < 2.6),
    });
  });

  gate(c);

  // the north side of the square: the embassy, then the Adlon
  embassy(c, 14.2, E + 0.1, 9.4, 7.6);
  adlon(c, 24.4, E + 0.1, 13.2, 8.2);
  // and a pavilion café at the corner by the river, its tables out under parasols
  pen.obj(() => {
    pen.box(38.4, E + 0.1, 0, 5.0, 5.4, 3.4, C.white, { top: C.zinc });
    const f = pen.wall("y+", 38.4, E + 0.1, 0, 5.0, 5.4);
    f.rect(0.4, 0.4, 4.6, 2.5, C.glassLight, { outline: true, w: W_THIN, glow: 0.85 });
    for (const a of [1.45, 2.5, 3.55]) f.seg(a, 0.4, a, 2.5, { w: 0.05, wobble: 0, layer: 1 });
    f.text("CAFÉ", 2.5, 2.72, 0.42, { align: "c", layer: 1 });
  });
  for (let k = 0; k < 6; k++) cafeTable(pen, rng, 32.6 + (k % 3) * 3.4, 15.2 + Math.floor(k / 3) * 3.2, k % 2 ? C.white : C.green, 2 + (k % 3 === 1 ? 1 : 0));

  parterre(c, 18.6, AX - 11.2, 28.6, AX - 4.6);
  parterre(c, 18.6, AX + 4.6, 28.6, AX + 11.2);

  // Unter den Linden: two rows of limes either side of the promenade, benches under them, Old Fritz in the middle
  for (let x = 31.6; x < B - QUAY - 1; x += 3.3) {
    for (const o of [-3.5, 3.5]) tree(pen, rng, x + rng.range(-0.2, 0.2), AX + o, { kind: "elm", h: 2.5, r: 1.55 });
    if (Math.round((x - 31.6) / 3.3) % 2 === 0) {
      for (const o of [-6.2, 6.2]) tree(pen, rng, x + 1.6, AX + o, { kind: "elm", h: 2.3, r: 1.45 });
    }
  }
  for (const [x, o, r] of [
    [33.3, -4.6, 0],
    [39.9, -4.6, 0],
    [36.6, 4.7, 180],
  ] as [number, number, number][]) {
    bench(pen, x, AX + o, r);
    person(pen, x - 0.4, AX + o + (r ? -0.2 : 0.2), 0.3, randomLook(rng), "sit", rng.chance(0.5));
    if (rng.chance(0.7)) person(pen, x + 0.45, AX + o + (r ? -0.2 : 0.2), 0.3, randomLook(rng), "sit", rng.chance(0.5));
  }
  oldFritz(pen, 38.4, AX);
  for (const x of [31.2, 36, 41]) {
    lamp(pen, x, AX - 2.75, 0, 3.3);
    lamp(pen, x + 2.4, AX + 2.75, 0, 3.3);
  }

  // south of the promenade: currywurst, a column of posters, and the Trabi safari lined up to go
  pen.push(31.4, AX + 7.4, 0);
  imbiss(pen, rng, { sign: "CURRYWURST", queue: 4 });
  pen.pop();
  litfass(pen, rng, 30.6, AX + 4.4);
  TRABI.slice(0, 3).forEach((col, k) => trabi(pen, 38.2 + k * 2.2, AX + 9.6, 262 + k * 4, col));
  pen.obj(() => {
    const sg = pen.card(41.4, AX + 7.6, 0);
    sg.bar(0, 0, 0, 2.3, 0.09, C.greyDark);
    sg.rect(-1.5, 1.5, 1.5, 2.4, C.yellow, { outline: true, w: W_FINE, layer: 1 });
    sg.text("TRABI SAFARI", 0, 1.78, 0.3, { align: "c", layer: 2, w: 0.055 });
  });
  queue(pen, rng, 37.0, AX + 7.2, 4, 1, 0.15);
  buddyBear(pen, 43.0, AX + 5.0, C.blue);

  // behind the Gate, on the western side: the U-Bahn, bikes, and people taking the picture everybody takes
  uSign(pen, E + 1.4, AX - 9.5, 0);
  bikeRow(pen, rng, E + 0.9, AX - 7.6, 7, 0, 0.62);
  for (let k = 0; k < 6; k++) person(pen, E + rng.range(0.4, 3.2), AX + rng.range(3.4, 9), 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5));
  for (let k = 0; k < 3; k++) person(pen, E + rng.range(0.6, 3), AX - rng.range(3.2, 5.6), 0, randomLook(rng), "stand", true);

  // the square's people. A guided group, all looking up at the Quadriga behind an umbrella held high
  const gx = 15.0;
  const gy = AX + 4.6;
  const guide: Look = { ...randomLook(rng), top: C.orange, hat: null };
  person(pen, gx, gy, 0, guide, "wave", false);
  pen.obj(() => {
    const cd = pen.card(gx + 0.5, gy, 1.8);
    cd.bar(0, 0, 0, 1.3, 0.06, C.black);
    cd.poly(
      [
        [-0.55, 1.3],
        [0.55, 1.3],
        [0, 1.75],
      ],
      C.red,
      { outline: true, w: W_FINE, layer: 1 },
    );
  });
  for (let k = 0; k < 9; k++) {
    const a = 0.5 + (k / 9) * 2.2;
    person(pen, gx + 1.3 + Math.cos(a) * rng.range(1.2, 2.6), gy + 0.6 + Math.sin(a) * rng.range(0.8, 2.2), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), true, rng.chance(0.15) ? 0.72 : 1);
  }
  // the bear who waves for a living, and the family having its picture taken with him
  bearSuit(pen, 15.7, AX - 8.9, false);
  person(pen, 16.6, AX - 8.6, 0, randomLook(rng), "stand", true, 0.72);
  person(pen, 14.8, AX - 8.6, 0, randomLook(rng), "cheer", false, 0.72);
  person(pen, 17.4, AX - 6.6, 0, randomLook(rng), "wave", true);
  // a wedding couple, because there is always one
  const bride: Look = { skin: [246, 211, 184], hair: [124, 82, 48], top: C.white, legs: C.white, long: true, hat: null };
  const groom: Look = { skin: [238, 187, 150], hair: [43, 32, 25], top: C.charcoal, legs: C.charcoal, long: false, hat: null };
  person(pen, 29.0, AX - 12.6, 0, bride, "stand", false);
  person(pen, 29.8, AX - 12.6, 0, groom, "stand", true);
  person(pen, 27.2, AX - 13.6, 0, { ...randomLook(rng), top: C.black }, "wave", false);
  // everyone else
  const spots: V2[] = [
    [15.6, 14.2],
    [17.4, 15.6],
    [20.6, 14.6],
    [23.5, 16.4],
    [26.4, 14.4],
    [30.6, 22.5],
    [31.4, 24.8],
    [29.6, 36.6],
    [30.8, 40.6],
    [15.2, 40.2],
    [16.6, 42.0],
    [21.5, AX + 12.2],
    [25.6, AX + 12.4],
    [34.5, 23.6],
    [41.5, 22.2],
    [43.2, 24.4],
    [42.4, 41.6],
    [35.5, 42.4],
  ];
  for (const [x, y] of spots) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave", "stand", "cheer"]), rng.chance(0.5), rng.chance(0.14) ? 0.72 : 1);
    if (rng.chance(0.4)) person(pen, x + 0.75, y + 0.2, 0, randomLook(rng), "stand", true);
  }
  dog(pen, 30.4, 41.2, 0, C.cream, true);

  // ---- the bubble man, just in front of the columns, and the children who have found him
  const ax = 15.4;
  const ay = AX - 4.3;
  const man: Look = { skin: [211, 154, 108], hair: [43, 32, 25], top: C.teal, legs: C.charcoal, long: false, hat: C.yellow };
  person(pen, ax, ay, 0, man, "cheer", false);
  pen.obj(() => {
    // his bucket of soap
    pen.cyl(ax - 0.8, ay + 0.5, 0, 0.3, 0.5, C.blue, { seg: 8, top: C.glassPale });
  });
  const kids: [number, number, boolean][] = [
    [17.6, ay - 1.3, true],
    [18.1, ay + 1.5, true],
    [16.0, ay - 2.3, false],
    [17.0, ay + 2.6, true],
  ];
  for (const [x, y, fl] of kids) person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave"]), fl, 0.72);
  person(pen, 18.9, ay - 0.4, 0, randomLook(rng), "stand", true);
  person(pen, 19.3, ay + 0.9, 0, randomLook(rng), "wave", true);
  dog(pen, 15.4, ay + 2.9, 0, C.woodDark, false, 0.9);

  // two children who cannot stand still, each on their own spring
  const jumpers = [
    { x: 16.7, y: ay - 0.2, look: randomLook(rng), ph: 0.0, flip: true },
    { x: 17.3, y: ay + 1.0, look: randomLook(rng), ph: 1.7, flip: true },
  ].map((j) => ({ ...j, sprite: makeSprite((p) => person(p, 0, 0, 0, j.look, "cheer", j.flip, 0.72), 0, 31) }));
  for (const j of jumpers) {
    c.movers.push((m) => {
      const hop = Math.abs(Math.sin(m.t * 4.6 + j.ph));
      m.put(j.sprite, c.ox + j.x, c.oy + j.y, c.oz + hop * hop * 0.55, c.done);
    });
  }

  // the bubbles: a steady stream of small ones, and a giant one when the camera comes to look
  const wx = c.ox + ax;
  const wy = c.oy + ay;
  const wz = c.oz;
  const pale: RGB = [176, 222, 240];
  const rose: RGB = [246, 190, 215];
  const ring = (cd: Plane, r: number, wob: number, alpha: number) => {
    const pts: V2[] = [];
    const n = r > 0.6 ? 18 : 10;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * (1 + 0.07 * Math.sin(2 * a + wob) + 0.04 * Math.sin(3 * a - wob * 1.3));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    cd.line(pts, { closed: true, color: pale, w: 0.1 + r * 0.05, alpha, kind: L_MARK, wobble: 0 });
    cd.arc(0, 0, r * 0.7, r * 0.7, 0.5, 1.5, { color: C.white, w: 0.1 + r * 0.06, alpha, kind: L_MARK, wobble: 0, seg: 5 });
    cd.arc(0, 0, r * 0.78, r * 0.78, 3.6, 4.6, { color: rose, w: 0.08 + r * 0.04, alpha: alpha * 0.85, kind: L_MARK, wobble: 0, seg: 5 });
  };
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(wx + 2, wy, wz + 3, 14)) return;
    const s = c.stay();
    // small ones: each lives 3.6 s, rising and drifting east on the wind
    for (let k = 0; k < 13; k++) {
      const life = 3.9;
      const tt = m.t + k * 0.31;
      const gen = Math.floor(tt / life);
      const u = (tt - gen * life) / life;
      const h1 = hash1(gen * 7.13 + k * 3.7);
      const h2 = hash1(gen * 3.31 + k * 9.1);
      const h3 = hash1(gen * 5.77 + k * 1.3);
      const x = wx + 0.5 + u * (2.6 + h1 * 2.6);
      const y = wy + (h2 - 0.5) * 3.4 * u;
      const z = wz + 2.3 + u * (1.2 + h3 * 3.4) + Math.sin(u * 9 + k) * 0.12;
      const r = (0.24 + 0.34 * h3) * Math.min(1, u * 5);
      const alpha = u < 0.86 ? 0.9 : ((1 - u) / 0.14) * 0.9;
      ring(m.pen.card(x, y, z), r, tt * 3 + k, alpha);
    }
    // the giant: it swells off his rope for a second, wobbles away over the children, and one of them bursts it
    const beats = s ? [s.at + 0.5, ...(s.closeup ? [s.closeup.at + 0.35] : [])] : [c.done + 1.5];
    for (const b of beats) {
      const u = m.t - b;
      if (u < 0 || u > 3.0) continue;
      const grow = Math.min(1, u / 1.1);
      const r = 0.3 + 1.35 * grow * (2 - grow);
      const drift = Math.max(0, u - 0.9);
      const x = wx + 0.9 + drift * 0.75;
      const y = wy + 0.1 + drift * 0.28;
      const z = wz + 2.5 + drift * 0.5 + Math.sin(u * 4) * 0.08;
      if (u < 2.55) ring(m.pen.card(x, y, z), r, u * 5, 0.95);
      else {
        // gone: a ring of drops where it was
        const f = (u - 2.55) / 0.45;
        const cd = m.pen.card(x, y, z);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + 0.2;
          cd.seg(Math.cos(a) * r * (1 + f * 0.5), Math.sin(a) * r * (1 + f * 0.5) - f * f * 0.5, Math.cos(a) * r * (1.12 + f * 0.6), Math.sin(a) * r * (1.12 + f * 0.6) - f * f * 0.5, {
            color: pale,
            w: 0.08,
            alpha: 1 - f,
            kind: L_MARK,
            wobble: 0,
          });
        }
      }
    }
  });

  // ---- everything else that moves
  // people walking through the middle passage of the Gate, as they could not for twenty-eight years
  const through = stroll(c, [
    [E + 0.6, AX + 0.62],
    [16.2, AX + 0.62],
    [16.2, AX - 0.62],
    [E + 0.6, AX - 0.62],
  ], 0.55);
  for (let k = 0; k < 7; k++) c.movers.push(walker(through, rng, c.done + rng.range(0, 1)));
  // round the two halves of the square
  const north = stroll(c, [
    [17.5, AX - 12.3],
    [29.6, AX - 12.3],
    [29.6, AX - 3.5],
    [17.5, AX - 3.5],
  ]);
  const south = stroll(c, [
    [17.5, AX + 3.5],
    [29.6, AX + 3.5],
    [29.6, AX + 12.3],
    [17.5, AX + 12.3],
  ]);
  for (let k = 0; k < 5; k++) c.movers.push(walker(north, rng, c.done + rng.range(0, 1)));
  for (let k = 0; k < 4; k++) c.movers.push(walker(south, rng, c.done + rng.range(0, 1)));
  // pigeons round the Quadriga
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 5; k++) {
    const r = 3.6 + k * 1.2;
    const sp = (0.55 + 0.08 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 6 + ph) & 1;
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + GX + Math.cos(a) * r * 0.7, c.oy + AX + Math.sin(a) * r, c.oz + 18 + Math.sin(m.t * 0.7 + ph) * 1.1, born);
    });
  }
  void L_BAR;
  void scaleRGB;
  void Rng;
};
