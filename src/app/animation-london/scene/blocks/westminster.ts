// Westminster. The Palace of Westminster runs along the river: the Victoria
// Tower flying the flag at one end, the clock tower everyone calls Big Ben at
// the other by the bridge, and between them a terrace over the water where
// members take tea under striped awnings (red for the Lords, green for the
// Commons). Behind it Westminster Abbey shows its rose window to Parliament
// Square, where there are statues, a small and polite demonstration, a
// television crew on the green, and a queue to be photographed in a phone box.
// The clock keeps time with the film, and strikes three as the camera arrives.

import { RGB, Rng, V2, V3, ease, hex, scaleRGB, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, castWalker, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN, UK_RED } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  bench,
  bobby,
  bricks,
  bulb,
  clock,
  dog,
  flag,
  lamp,
  lancet,
  person,
  phoneBox,
  pigeonOn,
  pointed,
  railing,
  randomLook,
  snapper,
  speckle,
  stall,
  suit,
  tree,
  tufts,
  umbrella,
  van,
} from "../props";

// the palace's honey-coloured stone, and the paler stone of the abbey
const STONE = C.bath;
const STONE_L = C.bathLight;
const STONE_D = C.bathDark;
const TIDE = scaleRGB(C.bathDark, 0.82);
const GILT = hex("#ecd58f");
const SLATE = hex("#59627a");
const ABBEY = C.portland;
const ABBEY_L = C.portlandLight;
const ABBEY_D = C.portlandDark;
const OAK = hex("#5a4636");
const DARK = hex("#4b4038");
const BRONZE = C.bronze;
const BRONZE_D = hex("#4f6a58");

// The palace's river range: from the Victoria Tower (west) to the clock tower (east). Its front is on the river.
const PX0 = 14.2;
const PX1 = 38.8;
const PY0 = 41.0;
const PF = 47.6;
const PH = 8.2;
// The terrace, built out over the water on its own wall.
const TX0 = 14.8;
const TX1 = 39.2;
const TY0 = 48;
const TY1 = 52;
// The Victoria Tower.
const VX = 8.2;
const VY = 41.8;
const VS = 5.8;
const VH = 18;
// The clock tower: its foot, and the wider stage the dials are on.
const EX = 38.8;
const EY = 39.4;
const ES = 4.2;
const DIAL_Z = 15;
const DIAL_S = 4.7;
const DIAL_H = 4.3;
const DX = EX - (DIAL_S - ES) / 2;
const DY = EY - (DIAL_S - ES) / 2;
/** Centre of a dial on its face. */
const CA = DIAL_S / 2;
const CB = DIAL_H / 2;
/** The tower's axis. */
const TOWER: V2 = [EX + ES / 2, EY + ES / 2];
// Parliament Square's lawn.
const LAWN = { x0: 8.5, y0: 20, x1: 29.5, y1: 31.4 };
// The abbey: nave along x, the transept crossing it, twin towers at the west front (which here faces +x).
const NAVE = { x0: 6.5, x1: 26.4, y0: 7.5, y1: 13, h: 9 };
const TRANSEPT = { x0: 10.5, x1: 15.5, y0: 5.8, y1: 17 };
const AISLE = 14.5;
/** Where the pigeons like to stand. */
const PIGEONS: V2 = [37.4, 18.2];

const inLawn = (x: number, y: number, pad = 0) => x > LAWN.x0 - pad && x < LAWN.x1 + pad && y > LAWN.y0 - pad && y < LAWN.y1 + pad;

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  pen.floor(0, 1).rect(4.2, 4.2, 43.8, 48, C.plaza, { grain: 0.7 });
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // the lawn of Parliament Square, mown in stripes
  g2.rect(LAWN.x0, LAWN.y0, LAWN.x1, LAWN.y1, C.grass, { outline: true, w: W_THIN });
  for (let k = 0; k < 7; k++) g3.rect(LAWN.x0 + 0.25 + k * 3, LAWN.y0 + 0.25, LAWN.x0 + 1.75 + k * 3, LAWN.y1 - 0.25, C.grassLight, { grain: 0.6 });
  tufts(pen.floor(0, 4), LAWN.x0 + 0.4, LAWN.y0 + 0.4, LAWN.x1 - 0.4, LAWN.y1 - 0.4, 0.26);
  // the abbey's green, and the gardens beyond the Victoria Tower
  g2.rect(35.2, 4.5, 43.6, 7.6, C.grass, { outline: true, w: W_THIN });
  g2.rect(4.4, 36.4, 7.4, 47.4, C.grass, { outline: true, w: W_THIN });
  // flagstones
  speckle(g2, 4.5, 17.4, 43.5, 40.6, C.streetDark, 0.14, (a, b) => !inLawn(a, b, 0.3));
  speckle(g2, 30, 4.6, 43.5, 17.4, C.streetDark, 0.14, (a, b) => !(a > 35 && b < 7.8));
}

// ---------------------------------------------------------------- Westminster Abbey

function abbey(c: LondonCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.7);
  const nl = NAVE.x1 - NAVE.x0;
  const nd = NAVE.y1 - NAVE.y0;
  // the nave: clerestory windows above the aisle roofs
  pen.obj(() => {
    pen.box(NAVE.x0, NAVE.y0, 0, nl, nd, NAVE.h, ABBEY);
    const f = pen.wall("y+", NAVE.x0, NAVE.y0, 0, nl, nd);
    f.rect(0, NAVE.h - 0.5, nl, NAVE.h, ABBEY_L, { grain: 0.4 });
    f.seg(0, NAVE.h - 0.5, nl, NAVE.h - 0.5, { w: W_FINE });
    for (const [a0, a1, n] of [
      [0, TRANSEPT.x0 - NAVE.x0, 2],
      [TRANSEPT.x1 - NAVE.x0, nl, 5],
    ]) {
      const bay = (a1 - a0) / n;
      for (let i = 0; i < n; i++) {
        const m = a0 + (i + 0.5) * bay;
        lancet(f, m - 0.45, 5.9, m + 0.45, 8.3, lit(), ABBEY_L);
      }
    }
  });
  // the aisles either side of the transept, their buttresses throwing flying arches up to the nave
  for (const [xa, xb] of [
    [NAVE.x0, TRANSEPT.x0],
    [TRANSEPT.x1, NAVE.x1],
  ]) {
    pen.obj(() => {
      const w = xb - xa;
      pen.box(xa, NAVE.y1, 0, w, AISLE - NAVE.y1, 4.4, ABBEY);
      pen.fill(
        [
          [xa, AISLE, 4.4],
          [xb, AISLE, 4.4],
          [xb, NAVE.y1, 5.5],
          [xa, NAVE.y1, 5.5],
        ],
        C.lead,
        { outline: true, w: W_THIN },
      );
      const f = pen.wall("y+", xa, NAVE.y1, 0, w, AISLE - NAVE.y1);
      const n = Math.max(2, Math.round(w / 2.1));
      const bay = w / n;
      f.rect(0, 0, w, 0.7, ABBEY_D, { grain: 0.8 });
      for (let i = 0; i < n; i++) {
        const m = (i + 0.5) * bay;
        lancet(f, m - 0.42, 1.1, m + 0.42, 3.8, lit(), ABBEY_L);
      }
      for (let i = 0; i <= n; i++) {
        const x = Math.min(xb - 0.22, Math.max(xa + 0.22, xa + i * bay));
        pen.box(x - 0.2, AISLE, 0, 0.4, 0.5, 5, ABBEY_L, { w: W_THIN });
        pen.pyramid(x - 0.24, AISLE - 0.02, 5, 0.48, 0.56, 1.0, ABBEY_L, { w: W_FINE });
        pen.pole([x, AISLE + 0.2, 4.9], [x, NAVE.y1 + 0.05, 7.4], 0.15, ABBEY_L);
      }
    }, 0.06);
  }
  pen.obj(() => pen.gable(NAVE.x0, NAVE.y0, NAVE.h, nl, nd, 2.7, "x", C.lead, { gable: ABBEY }), 0.14);

  // the transept, its front to the square: three doors, an arcade, and the rose window
  const tw = TRANSEPT.x1 - TRANSEPT.x0;
  const td = TRANSEPT.y1 - TRANSEPT.y0;
  pen.obj(() => {
    pen.box(TRANSEPT.x0, TRANSEPT.y0, 0, tw, td, NAVE.h, ABBEY);
    const f = pen.wall("y+", TRANSEPT.x0, TRANSEPT.y0, 0, tw, td);
    for (const [a, w, h] of [
      [2.5, 0.75, 2.7],
      [0.95, 0.5, 2.1],
      [4.05, 0.5, 2.1],
    ]) {
      f.poly(pointed(a - w, 0, a + w, h), OAK, { outline: true, w: W_FINE, grain: 0.6 });
      f.line(
        [
          [a - w - 0.18, h - 0.5],
          [a, h + 0.75],
          [a + w + 0.18, h - 0.5],
        ],
        { w: 0.07, color: ABBEY_D, kind: L_MARK, wobble: 0.3 },
      );
    }
    f.rect(0, 3.6, tw, 3.82, ABBEY_L, { grain: 0.4 });
    f.seg(0, 3.6, tw, 3.6, { w: W_FINE });
    for (let i = 0; i < 5; i++) lancet(f, 0.2 + i, 4.0, 0.8 + i, 5.2, lit(), ABBEY_L);
    f.circle(2.5, 7.05, 1.45, ABBEY_L, { outline: true, w: W_FINE, seg: 18, grain: 0.3 });
    f.circle(2.5, 7.05, 1.2, C.glass, { layer: 1, seg: 16, glow: 1, grain: 0.5 });
    for (let k = 0; k < 8; k++) {
      const t = (k / 8) * Math.PI * 2;
      f.seg(2.5 + Math.cos(t) * 0.34, 7.05 + Math.sin(t) * 0.34, 2.5 + Math.cos(t) * 1.2, 7.05 + Math.sin(t) * 1.2, { w: 0.06, color: ABBEY_L, kind: L_MARK, wobble: 0, layer: 2 });
    }
    f.circle(2.5, 7.05, 0.34, ABBEY_L, { layer: 2, seg: 8, grain: 0.3 });
    f.arc(2.5, 7.05, 0.8, 0.8, 0, Math.PI * 2, { w: 0.05, color: ABBEY_L, kind: L_MARK, wobble: 0, layer: 2, seg: 16, closed: true });
    // what shows of its east side, south of the nave
    const g = pen.wall("x+", TRANSEPT.x0, TRANSEPT.y0, 0, tw, td);
    lancet(g, 0.75, 5.6, 1.75, 8.2, lit(), ABBEY_L);
  }, 0.04);
  pen.obj(() => {
    pen.gable(TRANSEPT.x0, TRANSEPT.y0, NAVE.h, tw, td, 2.7, "y", C.lead, { gable: ABBEY });
    pen.wall("y+", TRANSEPT.x0, TRANSEPT.y0, NAVE.h, tw, td).circle(2.5, 0.95, 0.42, C.glass, { outline: true, w: W_FINE, seg: 10, glow: 0.8 });
    for (const x of [TRANSEPT.x0, TRANSEPT.x1]) {
      pen.cyl(x, TRANSEPT.y1, 0, 0.4, 10.2, ABBEY_L, { seg: 8, w: W_THIN });
      pen.cone(x, TRANSEPT.y1, 10.2, 0.48, 1.9, C.lead, { seg: 8, w: W_FINE });
    }
  }, 0.18);

  // the west front: the great window over the door, between the two towers
  pen.obj(() => {
    pen.box(26.4, 9.3, 0, 2.6, 2.4, 10, ABBEY);
    pen.gable(26.4, 9.3, 10, 2.6, 2.4, 1.3, "x", C.lead, { gable: ABBEY });
    const f = pen.wall("x+", 26.4, 9.3, 0, 2.6, 2.4);
    f.poly(pointed(0.55, 0, 1.85, 2.8), OAK, { outline: true, w: W_FINE, grain: 0.6 });
    f.seg(1.2, 0.1, 1.2, 2.6, { w: 0.05, wobble: 0, layer: 1 });
    f.line(
      [
        [0.3, 2.3],
        [1.2, 3.5],
        [2.1, 2.3],
      ],
      { w: 0.07, color: ABBEY_D, kind: L_MARK, wobble: 0.3 },
    );
    lancet(f, 0.4, 3.9, 2.0, 9.2, true, ABBEY_L);
    for (const a of [0.93, 1.47]) f.seg(a, 4.1, a, 8.2, { w: 0.05, color: ABBEY_L, kind: L_MARK, wobble: 0, layer: 2 });
  }, 0.2);
  const westTower = (y0: number, withClock: boolean) => {
    for (const [z0, z1, delay] of [
      [0, 7.4, 0.1],
      [7.4, 14.6, 0.3],
    ]) {
      pen.obj(() => {
        const h = z1 - z0;
        pen.box(26.4, y0, z0, 3.2, 3, h, ABBEY, { top: z0 > 0 ? ABBEY_D : null });
        for (const side of ["x+", "y+"] as const) {
          const f = pen.wall(side, 26.4, y0, z0, 3.2, 3);
          const w = side === "x+" ? 3 : 3.2;
          f.rect(0, h - 0.32, w, h, ABBEY_L, { grain: 0.4 });
          f.seg(0, h - 0.32, w, h - 0.32, { w: W_FINE });
          if (z0 === 0) {
            f.rect(0, 0, w, 0.7, ABBEY_D, { grain: 0.8 });
            lancet(f, w / 2 - 0.42, 1.3, w / 2 + 0.42, 3.3, lit(), ABBEY_L);
            lancet(f, w / 2 - 0.5, 4.0, w / 2 + 0.5, 6.8, lit(), ABBEY_L);
          } else {
            if (withClock && side === "x+") clock(f, w / 2, 1.2, 0.82, 3, 0);
            else f.circle(w / 2, 1.2, 0.55, C.glass, { outline: true, w: W_FINE, seg: 10, glow: 0.7 });
            // the belfry: two tall louvred openings
            for (const a of [w / 2 - 0.64, w / 2 + 0.64]) {
              lancet(f, a - 0.4, 2.5, a + 0.4, 6.4, false, ABBEY_L);
              for (const b of [3.2, 3.9, 4.6, 5.3]) f.seg(a - 0.26, b, a + 0.26, b, { w: 0.045, color: ABBEY_L, kind: L_MARK, wobble: 0, layer: 3 });
            }
          }
        }
      }, delay);
    }
    pen.obj(() => {
      for (const [dx, dy] of [
        [0, 0],
        [2.6, 0],
        [2.6, 2.4],
        [0, 2.4],
      ]) {
        pen.pyramid(26.4 + dx, y0 + dy, 14.6, 0.6, 0.6, 1.9, ABBEY_L, { w: W_FINE });
      }
    }, 0.46);
  };
  westTower(6.3, false);
  westTower(11.7, true);
}

// ---------------------------------------------------------------- the Palace of Westminster

/** A run of gothic bays on a wall: two tiers of pointed windows between string courses, a pierced parapet on top. */
function bays(f: Plane, rng: Rng, a0: number, n: number, bay: number, top: number): void {
  const a1 = a0 + n * bay;
  const mid = top * 0.56;
  f.rect(a0, 0, a1, 0.85, STONE_D, { grain: 0.8 });
  for (const b of [0.85, mid]) {
    f.rect(a0, b, a1, b + 0.22, STONE_L, { grain: 0.4, layer: 1 });
    f.seg(a0, b, a1, b, { w: W_FINE, layer: 1 });
  }
  f.rect(a0, top - 0.62, a1, top, STONE_L, { grain: 0.4, layer: 1 });
  f.seg(a0, top - 0.62, a1, top - 0.62, { w: W_FINE, layer: 1 });
  const w = Math.min(0.46, bay * 0.25);
  for (let i = 0; i < n; i++) {
    const m = a0 + (i + 0.5) * bay;
    lancet(f, m - w, 1.3, m + w, mid - 0.25, rng.chance(0.8), STONE_L);
    lancet(f, m - w, mid + 0.5, m + w, top - 0.85, rng.chance(0.7), STONE_L);
    f.circle(m, top - 0.31, 0.13, STONE_D, { layer: 2, seg: 6, grain: 0.3 });
  }
}

/** A stretch of the river front between two of its towers, under a slate roof with iron cresting. */
function curtain(pen: Pen, rng: Rng, xa: number, xb: number): void {
  const w = xb - xa;
  const n = 4;
  const bay = w / n;
  pen.obj(() => {
    pen.box(xa, PY0, 0, w, PF - PY0, PH, STONE);
    const f = pen.wall("y+", xa, PY0, 0, w, PF - PY0);
    bays(f, rng, 0, n, bay, PH);
    for (let i = 1; i < n; i++) f.block(i * bay - 0.13, 0, i * bay + 0.13, PH, 0.28, STONE_L, { w: W_FINE });
  });
  pen.obj(() => {
    pen.gable(xa, PY0 + 0.3, PH, w, PF - PY0 - 0.6, 2, "x", SLATE, { gable: STONE });
    for (let i = 1; i < n; i++) pen.pyramid(xa + i * bay - 0.2, PF - 0.06, PH, 0.4, 0.36, 1.05, STONE_L, { w: W_FINE });
    const ym = (PY0 + PF) / 2;
    for (let x = xa + 0.3; x < xb; x += 0.45) {
      pen.stroke(
        [
          [x, ym, PH + 2],
          [x, ym, PH + 2.32],
        ],
        { w: 0.05, color: C.iron, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.14);
}

/** One of the towers that punctuate the river front: taller than the range, standing a little forward of it. */
function pavilion(pen: Pen, rng: Rng, x0: number, w: number): void {
  const d = PF - PY0 + 0.35;
  const H = 10.4;
  pen.obj(() => {
    pen.box(x0, PY0, 0, w, d, H, STONE);
    const f = pen.wall("y+", x0, PY0, 0, w, d);
    const m = w / 2;
    f.rect(0, 0, w, 0.85, STONE_D, { grain: 0.8 });
    for (const a of [0.02, w - 0.34]) f.rect(a, 0.85, a + 0.32, H, STONE_L, { grain: 0.4, outline: true, w: 0.04, ink: STONE_D });
    lancet(f, m - 0.95, 1.3, m - 0.1, 4.3, rng.chance(0.8), STONE_L);
    lancet(f, m + 0.1, 1.3, m + 0.95, 4.3, rng.chance(0.8), STONE_L);
    f.rect(0.36, 4.6, w - 0.36, 4.82, STONE_L, { grain: 0.4, layer: 1 });
    f.seg(0.36, 4.6, w - 0.36, 4.6, { w: W_FINE, layer: 1 });
    lancet(f, m - 0.85, 5.2, m + 0.85, 8.9, true, STONE_L);
    for (const a of [m - 0.28, m + 0.28]) f.seg(a, 5.4, a, 8.0, { w: 0.05, color: STONE_L, kind: L_MARK, wobble: 0, layer: 2 });
    f.rect(0.36, 9.72, w - 0.36, H, STONE_L, { grain: 0.4, layer: 1 });
    f.seg(0.36, 9.72, w - 0.36, 9.72, { w: W_FINE, layer: 1 });
    // what shows of its side above the roofs
    const g = pen.wall("x+", x0, PY0, 0, w, d);
    g.rect(0, 9.72, d, H, STONE_L, { grain: 0.4, layer: 1 });
    g.seg(0, 9.72, d, 9.72, { w: W_FINE, layer: 1 });
    for (const a of [1.2, 2.6]) lancet(g, a - 0.3, 8.35, a + 0.3, 9.5, rng.chance(0.7), STONE_L);
  }, 0.05);
  pen.obj(() => {
    pen.hip(x0 - 0.1, PY0 - 0.1, H, w + 0.2, d + 0.2, 2.5, SLATE);
    for (const [dx, dy] of [
      [0, 0],
      [w, 0],
      [w, d],
      [0, d],
    ]) {
      pen.cone(x0 + dx, PY0 + dy, H, 0.25, 1.5, STONE_L, { seg: 6, w: W_FINE });
    }
  }, 0.22);
}

function palace(c: LondonCtx): void {
  const { pen, rng } = c;
  pavilion(pen, rng, PX0, 3);
  curtain(pen, rng, PX0 + 3, 24.9);
  pavilion(pen, rng, 24.9, 3.2);
  curtain(pen, rng, 28.1, PX1 - 3);
  pavilion(pen, rng, PX1 - 3, 3);

  // the spire over the central lobby
  const sx = 26.5;
  const sy = 43.4;
  pen.obj(() => {
    pen.cyl(sx, sy, 11.6, 0.95, 2.6, STONE_L, { seg: 8, top: STONE_D, w: W_THIN });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.cos(t - Math.PI / 4) < 0.1) continue;
      pen.stroke(
        [
          [sx + Math.cos(t) * 0.99, sy + Math.sin(t) * 0.99, 12.1],
          [sx + Math.cos(t) * 0.99, sy + Math.sin(t) * 0.99, 13.7],
        ],
        { w: 0.28, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.36);
  pen.obj(() => {
    pen.cone(sx, sy, 14.2, 1.08, 6.4, SLATE, { seg: 8, w: W_THIN });
    pen.pole([sx, sy, 20.6], [sx, sy, 21.5], 0.07, C.gold, { ink: false });
    pen.card(sx, sy, 21.5).circle(0, 0.05, 0.13, C.gold, { seg: 6, grain: 0.2, outline: true, w: 0.03 });
  }, 0.52);

  // the Speaker's end: a wing between the clock tower and the river, with a turret on its corner
  pen.obj(() => {
    pen.box(PX1, 43.6, 0, 4.2, 4, PH, STONE);
    bays(pen.wall("y+", PX1, 43.6, 0, 4.2, 4), rng, 0, 2, 2.1, PH);
    bays(pen.wall("x+", PX1, 43.6, 0, 4.2, 4), rng, 0, 2, 2, PH);
  }, 0.05);
  pen.obj(() => {
    pen.hip(PX1 + 0.1, 43.7, PH, 4, 3.8, 1.7, SLATE);
    pen.cyl(PX1 + 4.2, 47.6, 0, 0.5, PH + 1.6, STONE_L, { seg: 8, w: W_THIN });
    pen.cone(PX1 + 4.2, 47.6, PH + 1.6, 0.6, 1.7, SLATE, { seg: 8, w: W_FINE });
  }, 0.2);
}

// ---------------------------------------------------------------- the Victoria Tower

function victoriaTower(c: LondonCtx): void {
  const { pen, rng } = c;
  const lifts = 3;
  const lh = VH / lifts;
  // three lifts, so it grows as it is drawn
  for (let k = 0; k < lifts; k++) {
    pen.obj(() => {
      pen.box(VX, VY, k * lh, VS, VS, lh, STONE, { top: k === lifts - 1 ? STONE_D : null });
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, VX, VY, k * lh, VS, VS);
        f.rect(0, lh - 0.32, VS, lh, STONE_L, { grain: 0.4, layer: 1 });
        f.seg(0, lh - 0.32, VS, lh - 0.32, { w: W_FINE, layer: 1 });
        if (k === 0) f.rect(0, 0, VS, 0.85, STONE_D, { grain: 0.8 });
        for (let i = 0; i < 3; i++) {
          const m = 1.15 + i * 1.75;
          // the great archway the sovereign drives in under
          if (k === 0 && i === 1 && side === "y+") f.poly(pointed(m - 0.85, 0, m + 0.85, 5.0), DARK, { outline: true, w: W_THIN, grain: 0.6, layer: 1 });
          else lancet(f, m - 0.46, k === 0 ? 1.4 : 0.6, m + 0.46, lh - 0.9, rng.chance(0.75), STONE_L);
        }
      }
    }, 0.08 + k * 0.2);
  }
  pen.obj(() => {
    for (const [dx, dy] of [
      [VS, 0],
      [VS, VS],
      [0, VS],
    ]) {
      pen.cyl(VX + dx, VY + dy, 0, 0.62, VH + 1.4, STONE_L, { seg: 8, w: W_THIN });
      pen.cone(VX + dx, VY + dy, VH + 1.4, 0.72, 2.2, STONE_L, { seg: 8, w: W_FINE });
      pen.card(VX + dx, VY + dy, VH + 3.6).circle(0, 0.08, 0.11, C.gold, { seg: 6, grain: 0.2, outline: true, w: 0.03 });
    }
    pen.pyramid(VX + 0.6, VY + 0.6, VH, VS - 1.2, VS - 1.2, 1.1, C.lead, { w: W_THIN });
  }, 0.6);
  pen.obj(() => flag(pen, VX + VS / 2, VY + VS / 2, VH + 1.1, 5.6, "uk", 1.5), 0.68);
}

// ---------------------------------------------------------------- the terrace

/** A table laid for tea, with one or two people at it. */
function teaTable(pen: Pen, rng: Rng, x: number, y: number, a: Look, b: Look | null): void {
  pen.begin();
  pen.cyl(x, y, 0, 0.5, 0.72, C.white, { seg: 9, w: W_FINE });
  // a teapot and a stand of cakes
  const k = pen.card(x, y, 0.72);
  k.ellipse(-0.16, 0.12, 0.14, 0.11, rng.pick([C.royal, C.white, C.pink]), { outline: true, w: 0.03, seg: 7, grain: 0.2 });
  k.seg(0.16, 0.02, 0.16, 0.34, { w: 0.04, color: C.metal, kind: L_BAR, wobble: 0 });
  for (const [b0, r] of [
    [0.12, 0.16],
    [0.3, 0.11],
  ]) {
    k.rect(0.16 - r, b0, 0.16 + r, b0 + 0.05, C.white, { outline: true, w: 0.03, grain: 0, layer: 1 });
    k.circle(0.16, b0 + 0.09, 0.05, rng.pick([C.pink, C.yellow, C.brickBrown]), { seg: 5, grain: 0, layer: 2 });
  }
  bulb(pen, x - 0.36, y, 0.86, 0.18);
  for (const [dx, lk, flip] of [
    [-0.84, a, false],
    [0.84, b, true],
  ] as const) {
    if (!lk) continue;
    pen.box(x + dx - 0.2, y - 0.2, 0, 0.4, 0.4, 0.42, C.wood, { w: W_FINE });
    person(pen, x + dx, y, 0.3, lk, "bust", flip);
  }
  pen.end();
}

function terrace(c: LondonCtx): void {
  const { pen, rng } = c;
  const len = TX1 - TX0;
  const dep = TY1 - TY0;
  const H = -WATER;
  // the wall that carries it, rising from the river
  pen.obj(() => {
    pen.box(TX0, TY0, WATER, len, dep, H, STONE, { top: C.plaza });
    const f = pen.wall("y+", TX0, TY0, WATER, len, dep);
    f.rect(0, 0, len, 1.15, TIDE, { grain: 0.8 });
    f.seg(0, 1.15, len, 1.15, { w: 0.09, color: C.hedge, kind: L_MARK, wobble: 0.8, alpha: 0.7 });
    f.seg(0, 0.03, len, 0.03, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
    f.rect(0, H - 0.4, len, H, STONE_L, { grain: 0.4, layer: 1 });
    f.seg(0, H - 0.4, len, H - 0.4, { w: W_FINE, layer: 1 });
    bricks(f, 0.3, 1.35, len - 0.3, H - 0.55, STONE_D, 0.5);
    for (let a = 1.22; a < len; a += 2.44) f.block(a - 0.17, 0, a + 0.17, H - 0.4, 0.32, STONE, { w: W_FINE });
    const e = pen.wall("x+", TX0, TY0, WATER, len, dep);
    e.rect(0, 0, dep, 1.15, TIDE, { grain: 0.8 });
    e.rect(0, H - 0.4, dep, H, STONE_L, { grain: 0.4, layer: 1 });
    e.seg(0, H - 0.4, dep, H - 0.4, { w: W_FINE, layer: 1 });
  }, 0.05);
  // a pierced parapet round three sides
  pen.obj(() => {
    pen.box(TX0, TY1 - 0.24, 0, len, 0.24, 0.72, STONE_L, { w: W_THIN });
    pen.box(TX1 - 0.24, TY0, 0, 0.24, dep - 0.24, 0.72, STONE_L, { w: W_THIN });
    pen.box(TX0, TY0, 0, 0.24, dep - 0.24, 0.72, STONE_L, { w: W_THIN });
    const f = pen.wall("y+", TX0, TY1 - 0.24, 0, len, 0.24);
    for (let a = 0.5; a < len; a += 0.8) f.circle(a, 0.38, 0.14, STONE_D, { seg: 6, grain: 0.3 });
  }, 0.2);
  // the awnings: red and white at the Lords' end, green and white at the Commons'
  const awning = (x0: number, x1: number, rgb: RGB) => {
    pen.obj(() => {
      const w = x1 - x0;
      const n = Math.round(w / 0.61);
      const top = pen.plane([x0, PF + 0.06, 3.1], [1, 0, 0], [0, 2.0, -0.72], 0, true);
      for (let i = 0; i < n; i++) top.rect((i * w) / n, 0, ((i + 1) * w) / n, 1, i % 2 === 0 ? rgb : C.white, { grain: 0.6 });
      top.loop(
        [
          [0, 0],
          [w, 0],
          [w, 1],
          [0, 1],
        ],
        { w: W_THIN },
      );
      const val = pen.plane([x0, PF + 2.06, 2.02], [1, 0, 0], [0, 0, 1], 0, true);
      for (let i = 0; i < n; i++) val.rect((i * w) / n, 0, ((i + 1) * w) / n, 0.36, i % 2 === 0 ? rgb : C.white, { grain: 0.6 });
      val.loop(
        [
          [0, 0],
          [w, 0],
          [w, 0.36],
          [0, 0.36],
        ],
        { w: W_THIN },
      );
      for (let k = 0; k <= 4; k++) pen.pole([x0 + (k * w) / 4, PF + 2.0, 0], [x0 + (k * w) / 4, PF + 2.0, 2.38], 0.09, C.white);
      for (let a = 0.4; a < w; a += 0.75) bulb(pen, x0 + a, PF + 2.12, 1.96);
    }, 0.3);
  };
  awning(PX0 + 3.25, 24.65, C.red);
  awning(28.35, PX1 - 3.25, C.green);

  // tea, out in the open by the parapet
  const xs = [16.4, 19.3, 22.2, 25.1, 27.9, 30.8, 33.7, 36.6];
  xs.forEach((x, i) => {
    const one = rng.chance(0.6) ? suit(rng) : randomLook(rng);
    const two = rng.chance(0.85) ? (rng.chance(0.5) ? suit(rng) : randomLook(rng)) : null;
    if (i < 4 && rng.chance(0.5)) one.top = C.redDark;
    teaTable(pen, rng, x, 50.75, one, two);
  });
  // and a few leaning on the parapet, watching the boats
  for (const [x, pose, flip] of [
    [17.85, "stand", false],
    [23.65, "wave", false],
    [26.5, "stand", true],
    [32.25, "wave", true],
    [38.2, "stand", false],
  ] as const) {
    person(pen, x, 51.3, 0, rng.chance(0.6) ? suit(rng) : randomLook(rng), pose, flip);
  }
}

// ---------------------------------------------------------------- the clock tower

function elizabethTower(c: LondonCtx): void {
  const { pen, rng } = c;
  const [cx, cy] = TOWER;
  // the shaft, in two lifts
  for (const [z0, z1, delay] of [
    [0, 7.5, 0],
    [7.5, DIAL_Z, 0.14],
  ]) {
    pen.obj(() => {
      const h = z1 - z0;
      pen.box(EX, EY, z0, ES, ES, h, STONE, { top: null });
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, EX, EY, z0, ES, ES);
        // the corners read as slim eight-sided turrets
        for (const a of [0, ES - 0.34]) f.rect(a, 0, a + 0.34, h, STONE_L, { grain: 0.4, outline: true, w: 0.04, ink: STONE_D });
        // three tall panels of tracery, slit windows up each
        for (let k = 0; k < 3; k++) {
          const a = 0.55 + k * 1.06;
          f.rect(a, z0 === 0 ? 1.75 : 0, a + 0.92, z0 === 0 ? h : h - 0.6, STONE_D, { grain: 0.7 });
          for (let b = z0 === 0 ? 2.4 : 0.45; b < h - 1.4; b += 1.55) f.rect(a + 0.32, b, a + 0.6, b + 0.95, C.glass, { layer: 1, glow: rng.chance(0.55) ? 1 : 0, grain: 0.5 });
        }
        if (z0 === 0) {
          f.rect(0, 0, ES, 0.9, STONE_D, { grain: 0.8, layer: 1 });
          f.rect(0, 1.35, ES, 1.6, STONE_L, { grain: 0.4, layer: 1 });
          f.seg(0, 1.35, ES, 1.35, { w: W_FINE, layer: 1 });
          if (side === "x+") f.poly(pointed(1.6, 0, 2.6, 1.3), OAK, { outline: true, w: W_FINE, layer: 2, grain: 0.6 });
        } else {
          f.rect(0, h - 0.45, ES, h, STONE_L, { grain: 0.4, layer: 1 });
          f.seg(0, h - 0.45, ES, h - 0.45, { w: W_FINE, layer: 1 });
        }
      }
    }, delay);
  }
  // the clock stage: a gilt ring round an opal face, lit from behind at night. The hands are put on by a mover.
  pen.obj(() => {
    pen.box(DX, DY, DIAL_Z, DIAL_S, DIAL_S, DIAL_H, STONE_L, { top: null });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, DX, DY, DIAL_Z, DIAL_S, DIAL_S);
      f.rect(0.25, 0.2, DIAL_S - 0.25, DIAL_H - 0.18, GILT, { outline: true, w: W_FINE, grain: 0.4 });
      f.circle(CA, CB, 1.78, C.gold, { outline: true, w: W_FINE, layer: 1, seg: 20, grain: 0.3 });
      f.circle(CA, CB, 1.52, C.white, { layer: 2, seg: 20, grain: 0.2, glow: 0.9 });
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2;
        f.seg(CA + Math.sin(t) * 1.16, CB + Math.cos(t) * 1.16, CA + Math.sin(t) * 1.44, CB + Math.cos(t) * 1.44, { w: k % 3 === 0 ? 0.095 : 0.055, wobble: 0, layer: 3 });
      }
      f.circle(CA, CB, 0.16, C.gold, { layer: 7, seg: 8, grain: 0.2, outline: true, w: 0.035 });
      // blue shields in the corners
      for (const [a, b] of [
        [0.62, 0.6],
        [DIAL_S - 0.62, 0.6],
        [0.62, DIAL_H - 0.58],
        [DIAL_S - 0.62, DIAL_H - 0.58],
      ]) {
        f.circle(a, b, 0.2, C.royal, { layer: 1, seg: 7, grain: 0.3, outline: true, w: 0.035, ink: C.gold });
      }
    }
  }, 0.3);
  const ZB = DIAL_Z + DIAL_H + 0.3;
  pen.obj(() => {
    pen.box(DX - 0.15, DY - 0.15, DIAL_Z + DIAL_H, DIAL_S + 0.3, DIAL_S + 0.3, 0.3, STONE_L, { w: W_THIN });
    for (const [dx, dy] of [
      [0, 0],
      [DIAL_S, 0],
      [DIAL_S, DIAL_S],
      [0, DIAL_S],
    ]) {
      pen.cone(DX + dx, DY + dy, ZB, 0.26, 1.35, STONE_L, { seg: 6, w: W_FINE });
    }
  }, 0.4);
  // the belfry, open on every side so the bell can be heard: lit from inside after dark
  const BS = 3.9;
  pen.obj(() => {
    pen.box(cx - BS / 2, cy - BS / 2, ZB, BS, BS, 2, STONE, { top: null });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, cx - BS / 2, cy - BS / 2, ZB, BS, BS);
      for (let k = 0; k < 5; k++) f.poly(pointed(0.3 + k * 0.68, 0.2, 0.82 + k * 0.68, 1.72), DARK, { outline: true, w: 0.045, glow: 0.75, grain: 0.5 });
      f.rect(0, 1.8, BS, 2, STONE_L, { grain: 0.4, layer: 1 });
    }
  }, 0.46);
  // the roof: a slate skirt with gilded hips, the lantern, and the spire
  pen.obj(() => {
    const b0 = BS / 2 + 0.12;
    const t0 = 1.15;
    const z0 = ZB + 2;
    const z1 = z0 + 1.9;
    pen.solid(
      [
        [cx - b0, cy - b0, z0],
        [cx + b0, cy - b0, z0],
        [cx + b0, cy + b0, z0],
        [cx - b0, cy + b0, z0],
        [cx - t0, cy - t0, z1],
        [cx + t0, cy - t0, z1],
        [cx + t0, cy + t0, z1],
        [cx - t0, cy + t0, z1],
      ],
      [
        [1, 2, 6, 5],
        [3, 0, 4, 7],
        [2, 3, 7, 6],
        [0, 1, 5, 4],
        [4, 5, 6, 7],
      ],
      SLATE,
      { w: W_THIN },
    );
    for (const [sx, sy] of [
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      pen.stroke(
        [
          [cx + sx * b0, cy + sy * b0, z0 + 0.02],
          [cx + sx * t0, cy + sy * t0, z1],
        ],
        { w: 0.09, color: C.gold, kind: L_MARK, wobble: 0 },
      );
    }
    // the lantern: its light burns while the House is sitting
    pen.box(cx - 1.05, cy - 1.05, z1, 2.1, 2.1, 0.95, STONE_L, { w: W_THIN });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, cx - 1.05, cy - 1.05, z1, 2.1, 2.1);
      f.rect(0.25, 0.14, 1.85, 0.8, C.lamp, { outline: true, w: 0.04, glow: 1, grain: 0.2 });
      for (const a of [0.78, 1.32]) f.seg(a, 0.14, a, 0.8, { w: 0.05, color: STONE_L, kind: L_MARK, wobble: 0, layer: 1 });
    }
  }, 0.54);
  pen.obj(() => {
    const z = ZB + 2 + 1.9 + 0.95;
    pen.pyramid(cx - 1.2, cy - 1.2, z, 2.4, 2.4, 2.9, SLATE, { w: W_THIN });
    for (const [sx, sy] of [
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      pen.stroke(
        [
          [cx + sx * 1.2, cy + sy * 1.2, z + 0.02],
          [cx, cy, z + 2.9],
        ],
        { w: 0.08, color: C.gold, kind: L_MARK, wobble: 0 },
      );
    }
    pen.pole([cx, cy, z + 2.9], [cx, cy, z + 4], 0.07, C.gold, { ink: false });
    const k = pen.card(cx, cy, z + 3.5);
    k.circle(0, 0.5, 0.15, C.gold, { seg: 7, grain: 0.2, outline: true, w: 0.03 });
    k.seg(-0.2, 0.18, 0.2, 0.18, { w: 0.06, color: C.gold, kind: L_BAR, wobble: 0 });
  }, 0.62);
}

// ---------------------------------------------------------------- Parliament Square

const STATUE: Look = { skin: BRONZE, hair: BRONZE_D, top: BRONZE, legs: BRONZE_D, long: false, hat: null };

/** A bronze on a stone plinth. `extra` draws what it holds. */
function statue(pen: Pen, x: number, y: number, pose: Pose, flip: boolean, extra?: (k: Plane) => void): void {
  pen.obj(() => {
    pen.box(x - 0.68, y - 0.68, 0, 1.36, 1.36, 0.25, C.portlandDark, { w: W_FINE });
    pen.box(x - 0.55, y - 0.55, 0.25, 1.1, 1.1, 1.25, C.portland, { w: W_THIN, top: C.portlandLight });
    person(pen, x, y, 1.5, STATUE, pose, flip, 0.95);
    if (extra) extra(pen.card(x, y, 1.5));
  });
}

function square(c: LondonCtx): void {
  const { pen, rng } = c;
  // statesmen along the north edge of the lawn
  statue(pen, 9.8, 20.7, "stand", false);
  statue(pen, 13.0, 20.7, "wave", true);
  statue(pen, 16.2, 20.7, "stand", true);
  statue(pen, 25.8, 20.7, "stand", false);
  // one in a greatcoat, leaning on a stick and glowering at the palace
  statue(pen, 29.0, 20.7, "stand", false, (k) => {
    k.poly(
      [
        [-0.46, 0.3],
        [0.46, 0.3],
        [0.38, 1.38],
        [-0.38, 1.38],
      ],
      BRONZE,
      { outline: true, w: W_FINE, layer: 1.5, grain: 0.5 },
    );
    k.bar(0.52, 0.04, 0.4, 0.92, 0.07, BRONZE_D, { layer: 4 });
  });
  // and two on the west side: one holds up a banner
  statue(pen, 9.2, 23.7, "stand", true);
  statue(pen, 9.2, 28.5, "stand", false, (k) => {
    k.rect(-0.85, 0.92, 0.85, 1.5, hex("#86a590"), { outline: true, w: W_FINE, layer: 5, grain: 0.4 });
    k.text("COURAGE", 0, 1.1, 0.2, { align: "c", color: BRONZE_D, kind: L_MARK, w: 0.045, wobble: 0.2, layer: 6 });
  });
  // flags at the corners of the lawn, lamps, plane trees along the west side
  pen.obj(() => flag(pen, 8.95, 20.45, 0, 6.4, "uk", 1.1), 0.1);
  for (const [x, y] of [
    [8.9, 31.0],
    [31.4, 16.9],
    [31.5, 25.8],
    [40.2, 16.3],
    [33.0, 8.3],
  ]) {
    lamp(pen, x, y, 0, 3.5);
  }
  for (const [x, y] of [
    [5.7, 20.6],
    [5.7, 26.4],
    [5.7, 32.2],
    [37.4, 6.0],
    [41.8, 6.1],
    [5.9, 39.5],
    [5.9, 44.5],
  ]) {
    tree(pen, rng, x, y, { kind: "elm" });
  }
  // a bench on the east side of the lawn
  bench(pen, 29.7, 23.3, 270);
  person(pen, 29.75, 22.9, 0.42, randomLook(rng), "sit");
  person(pen, 29.75, 23.75, 0.42, randomLook(rng), "sit", true);
  // two who have given up on sightseeing and sat down on the grass
  person(pen, 10.2, 30.3, -0.3, randomLook(rng), "sit");
  person(pen, 11.1, 30.8, -0.3, randomLook(rng), "sit", true);

  // the railings of New Palace Yard, the gate, and the police who keep it
  railing(
    pen,
    [
      [42.2, 31.4, 0],
      [42.2, 32.9, 0],
    ],
    1.5,
    C.iron,
    0.5,
  );
  railing(
    pen,
    [
      [42.2, 35.7, 0],
      [42.2, 39.2, 0],
    ],
    1.5,
    C.iron,
    0.5,
  );
  pen.obj(() => {
    for (const y of [32.9, 35.1]) {
      pen.box(41.9, y, 0, 0.6, 0.6, 2.3, STONE_L, { w: W_THIN, top: STONE_D });
      pen.card(42.2, y + 0.3, 2.3).circle(0, 0.3, 0.3, C.lamp, { outline: true, w: W_FINE, glow: 1, seg: 9, grain: 0.2 });
    }
    // the gates stand open
    for (const [y0, y1] of [
      [33.5, 33.75],
      [35.1, 34.85],
    ]) {
      railing(
        pen,
        [
          [42.2, y0, 0],
          [40.9, y1, 0],
        ],
        1.4,
        C.iron,
        0.45,
      );
    }
  });
  bobby(pen, 43.1, 33.4, 0, "stand", false, rng);
  bobby(pen, 43.1, 35.4, 0, "stand", true, rng);
  // railings in front of the abbey's green
  railing(
    pen,
    [
      [35.2, 7.7, 0],
      [43.6, 7.7, 0],
    ],
    0.7,
    C.iron,
    0.9,
  );
}

// ---------------------------------------------------------------- the demonstration

/** A placard on a stick, for whoever stands at (x, y) to hold up. `side` is the hand it is in. */
function placard(pen: Pen, x: number, y: number, lines: string[], side: 1 | -1 = 1): void {
  const k = pen.card(x, y, 0);
  const a = side * 0.5;
  const h = 0.36 + lines.length * 0.4;
  pen.begin();
  k.seg(a, 1.3, a, 2.5, { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 4 });
  k.rect(a - 1.05, 2.4, a + 1.05, 2.4 + h, C.white, { outline: true, w: W_FINE, layer: 6, grain: 0.3 });
  lines.forEach((s, i) => k.text(s, a, 2.4 + h - 0.42 - i * 0.4, 0.24, { align: "c", w: 0.055, wobble: 0.3, layer: 7 }));
  pen.end();
}

function demonstration(c: LondonCtx): void {
  const { pen, rng } = c;
  const signs: [number, number, string[], 1 | -1][] = [
    [15.6, 27.6, ["MORE", "TEA"], 1],
    [18.6, 27.5, ["SAVE OUR", "BEES"], -1],
    [16.4, 29.2, ["BE KIND"], 1],
    [19.6, 29.3, ["CAKE", "FOR ALL"], 1],
    [22.2, 30.6, ["DOWN WITH", "DRIZZLE"], -1],
  ];
  for (const [x, y, lines, side] of signs) {
    pen.obj(() => {
      person(pen, x, y, 0, randomLook(rng), "wave", side < 0);
      placard(pen, x, y, lines, side);
    });
  }
  for (const [x, y, pose, small] of [
    [17.2, 27.9, "cheer", false],
    [20.2, 27.7, "stand", false],
    [17.9, 29.6, "stand", true],
    [21.1, 29.2, "cheer", false],
    [17.6, 30.9, "stand", false],
    [19.2, 30.7, "wave", false],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), pose, rng.chance(0.5), small ? 0.72 : 1);
  }
  // somebody has come as a bee
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.top = C.yellow;
    lk.legs = C.black;
    lk.hat = null;
    const x = 20.8;
    const y = 30.9;
    const k = pen.card(x, y, 0);
    for (const s of [-1, 1]) k.ellipse(s * 0.52, 1.28, 0.3, 0.42, C.white, { outline: true, w: 0.04, layer: -1, seg: 9, grain: 0.2 });
    person(pen, x, y, 0, lk, "wave");
    for (const b of [0.88, 1.08, 1.28]) k.seg(-0.31, b, 0.31, b, { w: 0.09, color: C.black, kind: L_MARK, wobble: 0, layer: 3 });
    for (const s of [-1, 1]) {
      k.seg(s * 0.12, 2.2, s * 0.3, 2.56, { w: 0.04, kind: L_BAR, wobble: 0, layer: 6 });
      k.circle(s * 0.3, 2.6, 0.07, C.black, { seg: 5, grain: 0, layer: 6 });
    }
  });
  // and somebody has brought a megaphone, and a dog
  pen.obj(() => {
    person(pen, 23.4, 29.6, 0, randomLook(rng), "stand", true);
    pen.card(23.4, 29.6, 0).poly(
      [
        [-0.36, 1.72],
        [-0.9, 2.0],
        [-0.9, 1.44],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 6, grain: 0.3 },
    );
  });
  dog(pen, 23.9, 31.0, hex("#b98352"), true, 0.9);
}

// ---------------------------------------------------------------- television, tourists, queues

function television(c: LondonCtx): void {
  const { pen, rng } = c;
  const x = 12.2;
  const y = 23.5;
  // the camera on its tripod, pointed at whoever is being asked
  pen.obj(() => {
    for (const [dx, dy] of [
      [-0.35, 0.2],
      [0.35, 0.2],
      [0, -0.38],
    ]) {
      pen.stroke(
        [
          [x + dx, y + dy, 0],
          [x, y, 1.5],
        ],
        { w: 0.07, kind: L_BAR, wobble: 0 },
      );
    }
    pen.box(x - 0.2, y - 0.4, 1.5, 0.4, 0.9, 0.45, C.charcoal, { w: W_THIN });
    pen.box(x - 0.12, y - 0.7, 1.6, 0.24, 0.3, 0.24, C.black, { w: W_FINE });
    const op = randomLook(rng);
    op.hat = C.black;
    person(pen, x + 0.2, y + 1.0, 0, op, "stand", true);
  });
  // the reporter, the member, and the microphone on its long pole
  pen.obj(() => {
    const rep = randomLook(rng);
    rep.top = C.red;
    person(pen, x - 0.7, y - 1.5, 0, rep, "wave");
    pen.card(x - 0.7, y - 1.5, 0).circle(0.66, 1.92, 0.1, C.charcoal, { layer: 5, seg: 6, grain: 0 });
    person(pen, x + 0.35, y - 1.6, 0, suit(rng), "stand", true);
    const boom = randomLook(rng);
    person(pen, x + 1.6, y - 0.9, 0, boom, "wave", true);
    const k = pen.card(x + 1.6, y - 0.9, 0);
    k.seg(-0.64, 1.86, -1.5, 2.55, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
    k.ellipse(-1.62, 2.6, 0.26, 0.15, C.grey, { outline: true, w: 0.04, layer: 6, seg: 8, grain: 0.6 });
  });
  // a lamp on a stand, for the evening news
  pen.obj(() => {
    pen.pole([x - 1.5, y - 0.2, 0], [x - 1.5, y - 0.2, 2.2], 0.07, C.iron);
    pen.card(x - 1.5, y - 0.2, 2.2).rect(-0.28, 0, 0.28, 0.4, C.lamp, { outline: true, w: W_FINE, glow: 1, grain: 0.2 });
  });
}

function phoneBoxQueue(c: LondonCtx): void {
  const { pen, rng } = c;
  phoneBox(pen, 39.5, 24.5, 0);
  // one poses in the doorway, one takes the picture, the rest wait their turn
  person(pen, 39.6, 25.45, 0, randomLook(rng), "wave");
  snapper(pen, 38.8, 27.4, randomLook(rng), false);
  for (let i = 0; i < 6; i++) {
    person(pen, 37.9 - i * 0.95 + rng.range(-0.1, 0.1), 24.7 + rng.range(-0.12, 0.12), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
}

function tourists(c: LondonCtx): void {
  const { pen, rng } = c;
  // photographing the tower, from every angle
  for (const [x, y] of [
    [33.6, 26.7],
    [35.6, 28.4],
    [39.8, 28.5],
    [37.2, 29.7],
    [31.3, 19.4],
  ]) {
    snapper(pen, x, y, randomLook(rng), true);
  }
  person(pen, 34.5, 26.2, 0, randomLook(rng), "cheer");
  person(pen, 36.5, 27.9, 0, randomLook(rng), "wave", true, 0.72);
  // a guided party, following the umbrella
  pen.obj(() => {
    const guide = randomLook(rng);
    guide.top = C.navy;
    person(pen, 36.4, 21.6, 0, guide, "stand");
    umbrella(pen, 36.4, 21.6, 0, C.red);
  });
  for (const [x, y] of [
    [33.0, 21.4],
    [34.0, 22.1],
    [34.9, 21.3],
    [35.3, 22.5],
    [33.6, 22.9],
  ]) {
    const lk = randomLook(rng);
    if (rng.chance(0.4)) lk.hat = C.yellow;
    person(pen, x, y, 0, lk, rng.pick(["stand", "stand", "wave"]), true, rng.chance(0.2) ? 0.72 : 1);
  }
}

function abbeyForecourt(c: LondonCtx): void {
  const { pen, rng } = c;
  // the queue to go in, a verger at the door, a board to say it is open
  person(pen, 29.8, 10.45, 0, { skin: SKIN[1], hair: HAIR[7], top: C.redDark, legs: C.redDark, long: false, hat: null }, "stand");
  for (let i = 0; i < 8; i++) {
    const lk = randomLook(rng);
    const x = 30.9 + i * 0.93 + rng.range(-0.1, 0.1);
    const y = 10.5 + rng.range(-0.14, 0.14);
    if (i === 3) snapper(pen, x, y, lk, true);
    else person(pen, x, y, 0, lk, rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
  pen.obj(() => {
    const k = pen.card(30.4, 12.3, 0);
    k.rect(-0.55, 0, 0.55, 1.1, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    k.text("ABBEY", 0, 0.62, 0.22, { align: "c", w: 0.05, wobble: 0.3, layer: 1 });
    k.text("OPEN", 0, 0.22, 0.22, { align: "c", w: 0.05, wobble: 0.3, layer: 1, color: C.redDark, kind: L_MARK });
  });
  // the ticket hut
  pen.obj(() => {
    pen.box(38.6, 9.4, 0, 1.8, 1.8, 2.4, C.ironGreen, { w: W_THIN });
    pen.pyramid(38.45, 9.25, 2.4, 2.1, 2.1, 0.9, C.lead, { w: W_THIN });
    const f = pen.wall("y+", 38.6, 9.4, 0, 1.8, 1.8);
    f.rect(0.25, 0.9, 1.55, 1.75, C.glassLight, { outline: true, w: W_FINE, glow: 0.9, grain: 0.3 });
    f.rect(0.15, 1.88, 1.65, 2.3, C.white, { outline: true, w: 0.04, grain: 0.2 });
    f.text("TICKETS", 0.9, 1.99, 0.19, { align: "c", w: 0.045, wobble: 0.2, layer: 1 });
    person(pen, 39.5, 11.0, 0.55, randomLook(rng), "bust");
  });
  bench(pen, 36.9, 8.5, 0);
  person(pen, 36.5, 8.55, 0.42, randomLook(rng), "sit");

  // souvenirs: flags, mugs, small red buses
  pen.push(37.0, 12.3, 0);
  stall(pen, rng, { w: 3.2, d: 2, a: UK_RED, b: C.white, goods: [C.red, C.royal, C.white, C.yellow], sign: "GIFTS" });
  pen.pop();
  pen.obj(() => flag(pen, 40.45, 14.6, 0, 3.6, "uk", 0.7), 0.1);
  person(pen, 38.0, 15.6, 0, randomLook(rng), "stand");
  person(pen, 39.3, 15.8, 0, randomLook(rng), "wave", true, 0.72);

  // the ice-cream van, and the people it draws
  const pink = hex("#f6c1d3");
  pen.push(33.3, 13.6, 0);
  van(pen, pink, null);
  pen.obj(() => {
    const f = pen.wall("y+", -2.4, -0.975, 0.3, 4.8, 1.95);
    f.rect(0.55, 0.72, 2.95, 1.6, C.glassLight, { outline: true, w: W_FINE, glow: 0.9, layer: 2, grain: 0.3 });
    const sign = pen.card(0.9, 0, 2.15);
    sign.rect(-0.95, 0.04, 0.95, 0.66, C.white, { outline: true, w: W_FINE, grain: 0.2 });
    sign.text("ICES", 0, 0.17, 0.36, { align: "c", color: C.redDark, kind: L_MARK, w: 0.075, wobble: 0.3, layer: 1 });
    person(pen, -0.7, 1.0, 0.98, { skin: SKIN[2], hair: HAIR[0], top: C.white, legs: C.white, long: false, hat: C.white }, "bust");
    // a cone the size of a child on the roof
    const k = pen.card(-0.9, 0, 2.15);
    k.poly(
      [
        [-0.3, 0.75],
        [0.3, 0.75],
        [0, 0],
      ],
      C.ochre,
      { outline: true, w: W_FINE, grain: 0.4 },
    );
    k.circle(0, 0.95, 0.36, C.white, { outline: true, w: W_FINE, layer: 1, seg: 9, grain: 0.2 });
    k.bar(0.08, 1.0, 0.34, 1.5, 0.09, C.woodDark, { layer: 2 });
  }, 0.1);
  pen.pop();
  for (const [x, y, s] of [
    [32.7, 15.45, 0.72],
    [33.5, 15.55, 0.72],
    [34.35, 15.45, 1],
  ]) {
    person(pen, x, y, 0, randomLook(rng), "stand", rng.chance(0.5), s);
  }
  // one already has his
  pen.obj(() => {
    person(pen, 31.5, 15.9, 0, randomLook(rng), "wave", false, 0.72);
    const k = pen.card(31.5, 15.9, 0);
    k.poly(
      [
        [0.38, 1.36],
        [0.54, 1.36],
        [0.46, 1.16],
      ],
      C.ochre,
      { layer: 5, grain: 0 },
    );
    k.circle(0.46, 1.44, 0.1, C.white, { outline: true, w: 0.03, layer: 6, seg: 6, grain: 0 });
  });
}

// ---------------------------------------------------------------- everything that moves

function motion(c: LondonCtx, tHands: number): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;
  const tx = c.ox + TOWER[0];
  const ty = c.oy + TOWER[1];
  /** The second the clock first reaches three: as the camera arrives, or a little after the place is drawn. */
  const strike0 = (): number => {
    const at = c.visit();
    return at == null ? born + 8 : at + 0.25;
  };
  /** A second of the film is a minute on the clock. Which hour struck last (0 is three o'clock), and how long ago. */
  const struck = (t: number): [number, number] => {
    const s = t - strike0();
    const n = Math.floor(s / 60);
    return [n, s - n * 60];
  };
  const GAP = 0.95;
  const LIFE = 2.3;
  const strokes = (n: number) => ((n + 2) % 12) + 1;

  // ---- the hands of the clock, on both dials
  c.movers.push((m) => {
    if (m.t < tHands || !m.sees(tx, ty, DIAL_Z + 2, 8)) return;
    const mins = 180 + (m.t - strike0());
    const am = ((((mins % 60) + 60) % 60) / 60) * Math.PI * 2;
    const ah = ((((mins / 60) % 12) + 12) % 12 / 12) * Math.PI * 2;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => tHands;
    dp.rng = new Rng(1859);
    for (const side of ["x+", "y+"] as const) {
      const f = dp.wall(side, c.ox + DX, c.oy + DY, DIAL_Z, DIAL_S, DIAL_S);
      f.seg(CA, CB, CA + Math.sin(am) * 1.3, CB + Math.cos(am) * 1.3, { w: 0.1, wobble: 0, layer: 6 });
      f.seg(CA, CB, CA + Math.sin(ah) * 0.86, CB + Math.cos(ah) * 0.86, { w: 0.16, wobble: 0, layer: 6 });
    }
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the bell: BONG, once for each hour, the letters writing themselves and drifting up
  c.movers.push((m) => {
    if (m.t < born) return;
    const [n, u] = struck(m.t);
    if (n < 0) return;
    const count = strokes(n);
    if (u > (count - 1) * GAP + LIFE || !m.sees(tx, ty, DIAL_Z + 9, 18)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    const dark = m.night > 0.5;
    const col: RGB = dark ? [255, 236, 190] : C.ink;
    const kind = dark ? L_SPARK : L_MARK;
    for (let k = 0; k < count; k++) {
      const v = (u - k * GAP) / LIFE;
      if (v < 0 || v > 1) continue;
      const side = k % 2 === 0 ? 1 : -1;
      const alpha = 1 - smooth(0.5, 1, v);
      dp.reveal = () => m.t - v * LIFE;
      const card = dp.card(tx, ty, DIAL_Z + 6.8 + v * 5.6);
      const at = side * (8.2 + v * 1.8);
      const size = 2.0 + v * 0.7;
      if (!dark) {
        dp.rng = new Rng(300 + k);
        card.text("BONG", at, 0, size, { align: "c", color: C.white, kind: L_MARK, w: 0.74, wobble: 0.5, alpha, layer: 1 });
      }
      // (a broad stroke is lifted further towards the camera than a fine one, so the ink is pushed out past the paper)
      dp.rng = new Rng(300 + k);
      card.text("BONG", at, 0, size, { align: "c", color: col, kind, w: 0.26, wobble: 0.5, alpha, bias: 1.1 });
      // the sound itself, spreading from the belfry
      for (const q of [0, 1, 2]) {
        const r = 4.3 + v * 2.6 + q * 0.75;
        dp.card(tx, ty, DIAL_Z + 5.7).arc(0, 0, r, r * 0.8, side > 0 ? -0.4 : Math.PI - 0.4, side > 0 ? 0.4 : Math.PI + 0.4, { w: 0.13, color: col, kind, wobble: 0.3, alpha: alpha * (0.8 - q * 0.2), seg: 6 });
      }
    }
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the ones who stop and point when it strikes
  const pr = new Rng(77);
  const lookers = (
    [
      [34.5, 27.7],
      [40.3, 29.5],
      [31.7, 21.9],
      [26.3, 19.0],
      [18.9, 26.4],
    ] as V2[]
  ).map(([x, y], i) => {
    const lk = randomLook(pr);
    // the arm that goes up is the one on the tower's side
    const flip = x - y > TOWER[0] - TOWER[1];
    return {
      p: W(x, y),
      down: makeSprite((p) => person(p, 0, 0, 0, lk, "stand", flip), 0, 140 + i),
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "wave", flip), 0, 140 + i),
      lag: pr.range(0, 0.5),
    };
  });
  c.movers.push((m) => {
    if (m.t < born) return;
    const [n, u] = struck(m.t);
    const until = (strokes(n) - 1) * GAP + LIFE;
    for (const q of lookers) {
      const up = n >= 0 && u > 0.15 + q.lag && u < until + q.lag;
      m.put(up ? q.up : q.down, q.p[0], q.p[1], q.p[2], born);
    }
  });

  // ---- pigeons: at every stroke of the hour (and at half past, out of habit) they go up, round and down again
  const bird = (how: "stand" | "peck" | "up" | "down", flip: boolean, seed: number) => makeSprite((p) => pigeonOn(p.card(0, 0, 0, flip), how), 0, seed);
  const standing = [
    [bird("stand", false, 3), bird("peck", false, 3)],
    [bird("stand", true, 3), bird("peck", true, 3)],
  ];
  const flying = [
    [bird("up", false, 4), bird("down", false, 4)],
    [bird("up", true, 4), bird("down", true, 4)],
  ];
  const fr = new Rng(21);
  const flock: { hx: number; hy: number; ox: number; oy: number; oz: number; lag: number; flip: number; ph: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const a = fr.range(0, 6.28);
    const r = Math.sqrt(fr.next()) * 1.9;
    flock.push({
      hx: PIGEONS[0] + Math.cos(a) * r,
      hy: PIGEONS[1] + Math.sin(a) * r * 0.8,
      ox: fr.range(-1.6, 1.6),
      oy: fr.range(-1.6, 1.6),
      oz: fr.range(-0.8, 0.8),
      lag: fr.range(0, 0.5),
      flip: fr.chance(0.5) ? 1 : 0,
      ph: fr.range(0, 10),
    });
  }
  // the flight: one lap out over the forecourt and back
  const fc: V2 = [36.6, 21.2];
  const th0 = Math.atan2(PIGEONS[1] - fc[1], PIGEONS[0] - fc[0]);
  const lap = (u: number, out: V3) => {
    const th = th0 + u * Math.PI * 2;
    out[0] = fc[0] + Math.cos(th) * 6.4;
    out[1] = fc[1] + Math.sin(th) * 5.2;
    out[2] = 6.2 + Math.sin(u * Math.PI) * 2.4;
  };
  const q: V3 = [0, 0, 0];
  const q2: V3 = [0, 0, 0];
  const T = 30;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 34, c.oy + 20, 4, 20)) return;
    const s0 = strike0();
    for (const b of flock) {
      const u = (((m.t - s0 - 0.2 - b.lag) % T) + T) % T;
      let x: number;
      let y: number;
      let z: number;
      let air = true;
      let right = b.flip === 0;
      if (u < 1.1) {
        const e = ease.inOut(u / 1.1);
        lap(0, q);
        x = b.hx + (q[0] + b.ox - b.hx) * e;
        y = b.hy + (q[1] + b.oy - b.hy) * e;
        z = (q[2] + b.oz) * e;
        right = q[0] - q[1] > b.hx - b.hy;
      } else if (u < 6.1) {
        const v = (u - 1.1) / 5;
        lap(v, q);
        lap(v + 0.01, q2);
        x = q[0] + b.ox;
        y = q[1] + b.oy;
        z = q[2] + b.oz;
        right = q2[0] - q2[1] > q[0] - q[1];
      } else if (u < 7.6) {
        const e = ease.inOut((u - 6.1) / 1.5);
        lap(1, q);
        x = q[0] + b.ox + (b.hx - q[0] - b.ox) * e;
        y = q[1] + b.oy + (b.hy - q[1] - b.oy) * e;
        z = (q[2] + b.oz) * (1 - e);
        right = b.hx - b.hy > q[0] - q[1];
      } else {
        x = b.hx;
        y = b.hy;
        z = 0;
        air = false;
      }
      const s = air ? flying[right ? 0 : 1][Math.floor(m.t * 9 + b.ph) & 1] : standing[b.flip][Math.floor(m.t * 1.3 + b.ph) % 3 === 0 ? 1 : 0];
      m.put(s, c.ox + x, c.oy + y, c.oz + z, born);
    }
  });

  // ---- a school party in hi-vis, two teachers and nine children, round the lawn
  const path: V3[] = [W(7.6, 19.0), W(30.5, 19.0), W(30.5, 32.3), W(7.6, 32.3)];
  const round = new Route(rounded(path, true, 1.2), true);
  const kr = new Rng(404);
  for (let k = 0; k < 11; k++) {
    const grown = k === 0 || k === 10;
    const lk: Look = { skin: kr.pick(SKIN), hair: kr.pick(HAIR), top: C.hivis, legs: kr.pick([C.navy, C.charcoal, C.greyDark]), long: kr.chance(0.5), hat: null };
    const kind = castWalker(lk, 60 + k, grown ? 1 : 0.7);
    c.movers.push(
      traveler(round, {
        speed: 1.25,
        at: 0.9 - (k * 0.95) / round.length,
        born: born + 0.1 + k * 0.05,
        span: 0.8,
        sprite: (h, t) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.8 + k) & 1],
      }),
    );
  }
  // ---- people going the other way round, and up and down the east side of the square
  const back = new Route(rounded([W(7.1, 32.5), W(31.0, 32.5), W(31.0, 18.5), W(7.1, 18.5)], true, 1.2), true);
  for (let i = 0; i < 6; i++) c.movers.push(walker(back, rng, born + rng.range(0, 1)));
  const east = new Route(rounded([W(41.0, 6.6), W(41.0, 30.6), W(42.8, 30.6), W(42.8, 6.6)], true, 0.5), true);
  for (let i = 0; i < 7; i++) c.movers.push(walker(east, rng, born + rng.range(0, 1)));

  // ---- a constable on his beat past the demonstration, hands behind his back
  const cop = (pose: Pose, flip: boolean) => makeSprite((p) => bobby(p, 0, 0, 0, pose, flip), 0, 71);
  const copFrames = [
    [cop("walkA", false), cop("walkB", false)],
    [cop("walkA", true), cop("walkB", true)],
  ];
  const beat = new Route(rounded([W(14.6, 32.0), W(24.6, 32.0), W(24.6, 32.3), W(14.6, 32.3)], true, 0.1), true);
  c.movers.push(traveler(beat, { speed: 0.8, at: 0.1, born, span: 0.6, sprite: (h, t) => copFrames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.2) & 1] }));

  // ---- a waiter up and down the terrace with a tray
  const WAITER: Look = { skin: SKIN[1], hair: HAIR[0], top: C.white, legs: C.black, long: false, hat: null };
  const waiter = (pose: Pose, flip: boolean): Sprite =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, WAITER, pose, flip);
        const k = p.card(0, 0, 0, flip);
        k.seg(0.3, 1.62, 0.95, 1.62, { w: 0.07, color: C.metal, kind: L_BAR, wobble: 0, layer: 5 });
        k.circle(0.62, 1.79, 0.13, C.white, { outline: true, w: 0.035, layer: 6, seg: 7, grain: 0 });
      },
      0,
      90,
    );
  const waiterFrames = [
    [waiter("walkA", false), waiter("walkB", false)],
    [waiter("walkA", true), waiter("walkB", true)],
  ];
  const service = new Route(rounded([W(16.2, 49.8), W(37.4, 49.8), W(37.4, 50.02), W(16.2, 50.02)], true, 0.08), true);
  c.movers.push(traveler(service, { speed: 1.3, at: 0.3, born, span: 0.6, sprite: (h, t) => waiterFrames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6) & 1] }));
}

// ---------------------------------------------------------------- the block

export const westminster: LondonBuilder = (c) => {
  const { pen } = c;
  c.early(() => ground(c));
  // the tower is tall: look a little up the page, so its top and the river front are both in view
  c.focus(29.4, 30.6, 1.05);

  abbey(c);
  square(c);
  demonstration(c);
  television(c);
  tourists(c);
  phoneBoxQueue(c);
  abbeyForecourt(c);
  victoriaTower(c);
  palace(c);
  elizabethTower(c);
  terrace(c);

  // the hands go on once the dials are drawn
  const tHands = pen.reveal(c.ox + TOWER[0], c.oy + TOWER[1], DIAL_Z) + 1.05;
  motion(c, tHands);
};
