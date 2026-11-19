// Buildings London has streets of: terraces in brick, stucco or ice-cream
// colours, shops under them, the pub on the corner, plain office blocks. And
// the parts grander buildings are assembled from: a portico, a flight of
// steps, battlements, a clock face, a gothic window.
//
// A building's footprint starts at the pen's origin and its front is on the
// local +y side, like everything else in the kit.

import { RGB, Rng, V2, scaleRGB } from "../engine/math";
import { F_NEON, F_WATER, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../engine/pen";
import { W_FINE, W_THIN, archWindow, bricks, railing, windowAt, windowGrid } from "./kit";
import { AWNING, C, DOOR, FASCIA, PASTEL, ROOF, TERRACE } from "./palette";

// ---------------------------------------------------------------- parts

/** A clock face on a wall, hands at the given time. It glows at night. */
export function clock(f: Plane, a: number, b: number, r: number, hour = 10, minute = 10, o: { face?: RGB; rim?: RGB; layer?: number } = {}): void {
  const L = o.layer ?? 1;
  f.circle(a, b, r, o.rim ?? C.gold, { outline: true, w: W_FINE, layer: L, seg: 16, grain: 0.3 });
  f.circle(a, b, r * 0.84, o.face ?? C.white, { layer: L + 1, seg: 16, grain: 0.2, glow: 0.85 });
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    f.seg(a + Math.sin(t) * r * 0.66, b + Math.cos(t) * r * 0.66, a + Math.sin(t) * r * 0.78, b + Math.cos(t) * r * 0.78, { w: 0.045, wobble: 0, layer: L + 2 });
  }
  const hm = ((minute % 60) / 60) * Math.PI * 2;
  const hh = (((hour % 12) + minute / 60) / 12) * Math.PI * 2;
  f.seg(a, b, a + Math.sin(hm) * r * 0.68, b + Math.cos(hm) * r * 0.68, { w: Math.max(0.05, r * 0.07), wobble: 0, layer: L + 3 });
  f.seg(a, b, a + Math.sin(hh) * r * 0.46, b + Math.cos(hh) * r * 0.46, { w: Math.max(0.065, r * 0.1), wobble: 0, layer: L + 3 });
}

/** The outline of a pointed arch: a doorway, a gothic window. */
export function pointed(a0: number, b0: number, a1: number, b1: number): V2[] {
  const w = a1 - a0;
  const sp = Math.max(b0, b1 - w * 0.9);
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, sp],
  ];
  for (let k = 1; k <= 4; k++) {
    const t = (k / 4) * (Math.PI / 2);
    pts.push([a1 - (w / 2) * (1 - Math.cos(t)), sp + (b1 - sp) * Math.sin(t)]);
  }
  for (let k = 3; k >= 0; k--) {
    const t = (k / 4) * (Math.PI / 2);
    pts.push([a0 + (w / 2) * (1 - Math.cos(t)), sp + (b1 - sp) * Math.sin(t)]);
  }
  return pts;
}

/** A gothic window: pointed, with a mullion. */
export function lancet(f: Plane, a0: number, b0: number, a1: number, b1: number, lit: boolean, trim: RGB = C.bathLight): void {
  const i = Math.min(0.13, (a1 - a0) * 0.16);
  f.poly(pointed(a0, b0, a1, b1), trim, { outline: true, w: W_FINE, grain: 0.3 });
  f.poly(pointed(a0 + i, b0 + i, a1 - i, b1 - i * 1.6), C.glass, { layer: 1, glow: lit ? 1 : 0, grain: 0.5 });
  if (a1 - a0 > 0.8) f.seg((a0 + a1) / 2, b0 + i, (a0 + a1) / 2, b1 - i * 2.2, { w: 0.05, color: trim, kind: L_MARK, wobble: 0, layer: 2 });
}

/** A flight of steps climbing towards local -y: `n` treads rising `h` over a run of `d`, `w` wide. */
export function steps(pen: Pen, x: number, y: number, z: number, w: number, d: number, h: number, n: number, rgb: RGB = C.portland): void {
  pen.begin();
  for (let k = 0; k < n; k++) {
    const run = (d * (n - k)) / n;
    pen.box(x, y, z + (h * k) / n, w, run, h / n, rgb, { w: 0.06, top: scaleRGB(rgb, 1.03) });
  }
  pen.end();
}

/**
 * A classical portico: a row of `n` columns along local x standing at the
 * front (the +y side) of a porch `d` deep, an entablature across them and,
 * unless asked not to, a pediment above.
 */
export function portico(
  pen: Pen,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  n: number,
  o: { stone?: RGB; roof?: RGB; pediment?: number; r?: number; back?: boolean } = {},
): void {
  const stone = o.stone ?? C.portland;
  const r = o.r ?? Math.min(0.42, (w / n) * 0.2);
  pen.begin();
  for (let k = 0; k < n; k++) {
    const cx = x + r + 0.15 + ((w - 2 * r - 0.3) * k) / (n - 1);
    pen.box(cx - r - 0.1, y + d - 2 * r - 0.2, z, 2 * r + 0.2, 2 * r + 0.2, 0.22, stone, { w: W_FINE });
    pen.cyl(cx, y + d - r - 0.1, z + 0.22, r, h - 0.5, stone, { seg: 8, w: W_THIN, r2: r * 0.86 });
    pen.box(cx - r - 0.08, y + d - 2 * r - 0.18, z + h - 0.28, 2 * r + 0.16, 2 * r + 0.16, 0.28, stone, { w: W_FINE });
  }
  pen.box(x - 0.15, y, z + h, w + 0.3, d + 0.15, 0.7, stone, { w: W_THIN });
  const ped = o.pediment ?? w * 0.17;
  if (ped > 0) {
    pen.gable(x - 0.3, y, z + h + 0.7, w + 0.6, d + 0.3, ped, "y", o.roof ?? C.lead, { gable: stone });
    const f = pen.wall("y+", x - 0.3, y, z + h + 0.7, w + 0.6, d + 0.3);
    f.poly(
      [
        [0.9, 0.16],
        [w - 0.3, 0.16],
        [(w + 0.6) / 2, ped - 0.22],
      ],
      scaleRGB(stone, 0.9),
      { outline: true, w: W_FINE, grain: 0.6 },
    );
  }
  pen.end();
}

/** Battlements along the top of a wall: a row of square merlons round a rectangle. */
export function battlements(pen: Pen, x: number, y: number, z: number, w: number, d: number, rgb: RGB, size = 0.6, gap = 0.6): void {
  pen.begin();
  const run = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.floor((len + gap) / (size + gap)));
    const step = (len - size) / (n - 1);
    for (let k = 0; k < n; k++) {
      const px = x0 + ((x1 - x0) / len) * step * k;
      const py = y0 + ((y1 - y0) / len) * step * k;
      pen.box(px, py, z, x1 > x0 ? size : 0.45, y1 > y0 ? size : 0.45, size * 0.9, rgb, { w: W_FINE });
    }
  };
  run(x, y + d - 0.45, x + w, y + d - 0.45);
  run(x + w - 0.45, y, x + w - 0.45, y + d);
  run(x, y, x + w, y);
  run(x, y, x, y + d);
  pen.end();
}

/** A round basin with a jet in the middle: the water shimmers. */
export function fountain(pen: Pen, x: number, y: number, r: number, jet = 2.2): void {
  pen.begin();
  pen.cyl(x, y, 0, r, 0.42, C.portland, { seg: 18, w: W_THIN, top: C.portlandLight });
  pen.floor(0.43, 1).circle(x, y, r - 0.32, C.water, { kind: F_WATER, outline: true, w: W_FINE, ink: C.waterInk, seg: 16 });
  pen.cyl(x, y, 0.42, r * 0.22, 0.75, C.portland, { seg: 8, w: W_FINE });
  pen.cyl(x, y, 1.17, r * 0.4, 0.14, C.portlandLight, { seg: 10, w: W_FINE });
  const c = pen.card(x, y, 1.3);
  for (const s of [-1, 0, 1]) {
    c.line(
      [
        [s * 0.08, 0],
        [s * 0.3, jet * 0.75],
        [s * 0.62, jet * 0.95],
        [s * 0.95, jet * 0.5],
        [s * 1.05, -0.7],
      ],
      { w: 0.09, color: C.white, kind: L_RIPPLE, wobble: 0.5, alpha: 0.9 },
    );
  }
  pen.end();
}

// ---------------------------------------------------------------- terraces

export type TerraceStyle = "georgian" | "stucco" | "pastel" | "redbrick";

export interface TerraceOpts {
  n: number;
  /** Width of each house, depth of the terrace, storeys above the ground floor. */
  w?: number;
  d?: number;
  floors?: number;
  style?: TerraceStyle;
  /** Shop names: a house with a name gets a shop front instead of a front door. */
  shops?: (string | null)[];
  /** Chance that a window is lit at night. */
  lit?: number;
  /** Iron railings along the front. */
  rails?: boolean;
}

function shopFront(pen: Pen, rng: Rng, f: Plane, w: number, d: number, name: string, lit: number): void {
  const col = rng.pick(FASCIA);
  f.rect(0.15, 0, w - 0.15, 2.95, C.stucco, { grain: 0.4, layer: -0.5 });
  f.rect(0.35, 0.45, w - 1.5, 2.15, C.glassLight, { outline: true, w: W_THIN, glow: Math.max(0.6, lit), layer: 1, grain: 0.3 });
  f.rect(w - 1.3, 0, w - 0.4, 2.15, col, { outline: true, w: W_THIN, layer: 1 });
  f.rect(w - 1.15, 0.9, w - 0.55, 1.95, C.glassLight, { layer: 2, glow: 0.7, grain: 0.3 });
  f.rect(0.15, 2.25, w - 0.15, 2.95, col, { outline: true, w: W_FINE, layer: 1 });
  const size = Math.min(0.42, ((w - 0.7) / Math.max(1, name.length)) * 1.05);
  f.text(name, w / 2, 2.6 - size / 2, size, { align: "c", color: C.gold, kind: L_MARK, w: 0.065, wobble: 0.3, layer: 2 });
  if (rng.chance(0.55)) {
    // an awning over the window
    const aw = pen.plane([0.25, d, 2.25], [1, 0, 0], [0, 0.95, -0.5], 0, true);
    const stripe = rng.pick(AWNING);
    const n = 5;
    const len = w - 1.6;
    for (let i = 0; i < n; i++) aw.rect((i * len) / n, 0, ((i + 1) * len) / n, 1, i % 2 === 0 ? stripe : C.white, { grain: 0.6 });
    aw.loop(
      [
        [0, 0],
        [len, 0],
        [len, 1],
        [0, 1],
      ],
      { w: W_THIN },
    );
  }
}

/**
 * A terrace of `n` houses along local +x from the origin, fronts on the +y
 * side. Georgian: yellow stock brick over a white ground floor. Stucco: all
 * white, with a porch on two columns. Pastel: the same in ice-cream colours.
 * Red brick: bay windows and gables. Returns the terrace's width.
 */
export function terrace(pen: Pen, rng: Rng, o: TerraceOpts): number {
  const style = o.style ?? "georgian";
  const w = o.w ?? 4.6;
  const d = o.d ?? 7;
  const floors = o.floors ?? 3;
  const lit = o.lit ?? 0.55;
  const ground = 2.95;
  const fh = 2.45;
  const h = ground + floors * fh + 0.5;
  const brick = style === "georgian" ? rng.pick([C.stock, C.stock, C.stockDark, C.soot]) : style === "redbrick" ? rng.pick([C.brick, C.brickDark]) : C.stucco;
  for (let i = 0; i < o.n; i++) {
    const wall = style === "pastel" ? rng.pick(PASTEL) : style === "georgian" && rng.chance(0.25) ? rng.pick(TERRACE) : brick;
    const trim = style === "redbrick" ? C.cream : C.white;
    const shop = o.shops?.[i] ?? null;
    const doorLeft = i % 2 === 0;
    pen.push(i * w, 0, 0);
    pen.begin();
    pen.box(0, 0, 0, w, d, h, wall, { top: C.charcoal });
    const f = pen.wall("y+", 0, 0, 0, w, d);
    // upper floors
    const cols = w >= 5.2 ? 3 : 2;
    const cw = (w - 0.8) / cols;
    for (let k = 0; k < floors; k++) {
      const b0 = ground + k * fh + 0.42;
      const tall = k === 0 ? 1.75 : k === floors - 1 ? 1.15 : 1.5;
      for (let q = 0; q < cols; q++) {
        const a0 = 0.4 + q * cw + cw * 0.2;
        windowAt(f, a0, b0, a0 + cw * 0.6, b0 + tall, rng.chance(lit), trim);
        if (k === 0 && style !== "redbrick" && rng.chance(0.3)) {
          // a window box
          f.block(a0 - 0.06, b0 - 0.26, a0 + cw * 0.6 + 0.06, b0 - 0.04, 0.26, C.woodDark, { w: W_FINE });
          f.ticks(a0, b0 - 0.06, a0 + cw * 0.6, b0 + 0.2, { n: 5, len: 0.2, ang: 1.57, jit: 0.5, color: rng.pick([C.red, C.pink, C.yellow, C.purple]), w: 0.13, layer: 3 });
        }
      }
      if (k === 0 && (style === "stucco" || style === "pastel")) {
        // a shallow iron balcony across the first floor
        f.block(0.3, b0 - 0.2, w - 0.3, b0 - 0.08, 0.55, C.stone, { w: W_FINE });
        railing(
          pen,
          [
            [0.32, d + 0.5, b0 - 0.08],
            [w - 0.32, d + 0.5, b0 - 0.08],
          ],
          0.6,
          C.iron,
          0.5,
        );
      }
    }
    // the cornice and parapet that hide the roof
    f.rect(0, h - 0.62, w, h - 0.34, trim, { grain: 0.3, layer: 1 });
    f.seg(0, h - 0.62, w, h - 0.62, { w: W_FINE, layer: 1 });
    if (style === "redbrick") bricks(f, 0.2, ground + 0.2, w - 0.2, h - 0.8, C.brickDark, 0.35);
    // ground floor
    if (shop) shopFront(pen, rng, f, w, d, shop, lit);
    else {
      if (style !== "redbrick") {
        f.rect(0, 0, w, ground, style === "pastel" ? scaleRGB(wall, 1.04) : C.stucco, { grain: 0.4, layer: -0.5 });
        f.seg(0, ground, w, ground, { w: W_FINE });
        for (const b of [0.75, 1.5, 2.25]) f.seg(0.1, b, w - 0.1, b, { w: 0.035, color: C.stoneDark, kind: L_MARK, wobble: 0.3, alpha: 0.7 });
      }
      const dw = 1.2;
      const da = doorLeft ? 0.5 : w - 0.5 - dw;
      const door = rng.pick(DOOR);
      f.block(da - 0.25, 0, da + dw + 0.25, 0.3, 0.8, C.stone, { w: W_THIN });
      f.rect(da, 0.3, da + dw, 2.2, door, { outline: true, w: W_THIN, layer: 1 });
      // the fanlight over the door
      const fan: V2[] = [
        [da, 2.2],
        [da + dw, 2.2],
      ];
      for (let q = 1; q < 6; q++) fan.push([da + dw / 2 + Math.cos((q / 6) * Math.PI) * (dw / 2), 2.2 + Math.sin((q / 6) * Math.PI) * 0.5]);
      f.poly(fan, C.glass, { outline: true, w: W_FINE, glow: rng.chance(lit) ? 1 : 0, layer: 1 });
      f.circle(da + dw / 2, 1.3, 0.07, C.gold, { layer: 2, seg: 6, grain: 0 });
      if (style === "stucco" || style === "pastel") {
        // a porch on two columns
        for (const a of [da - 0.2, da + dw + 0.2]) pen.cyl(a, d + 0.7, 0.3, 0.13, 2.25, C.white, { seg: 6, w: W_FINE });
        pen.box(da - 0.4, d, 2.55, dw + 0.8, 0.9, 0.22, C.white, { w: W_FINE });
      }
      const wa0 = doorLeft ? da + dw + 0.5 : 0.5;
      const wa1 = doorLeft ? w - 0.5 : da - 0.5;
      if (style === "redbrick") {
        // a bay window right up the front, under its own little gable
        const bw = wa1 - wa0;
        f.block(wa0, 0, wa1, ground + fh * Math.min(2, floors), 0.7, wall, { w: W_THIN });
        const bf = pen.wall("y+", wa0, d, 0, bw, 0.7);
        for (let k = 0; k <= Math.min(1, floors - 1); k++) windowAt(bf, 0.2, 0.7 + k * (ground + 0.1), bw - 0.2, 2.3 + k * (ground + 0.1), rng.chance(lit), trim);
      } else windowAt(f, wa0, 0.7, wa1, 2.3, rng.chance(lit), trim);
      if (o.rails !== false && style !== "redbrick") {
        railing(
          pen,
          [
            [doorLeft ? da + dw + 0.35 : 0.15, d + 0.9, 0],
            [doorLeft ? w - 0.15 : da - 0.35, d + 0.9, 0],
          ],
          0.8,
          C.iron,
          0.55,
        );
      }
    }
    // roofs and chimneys
    if (style === "redbrick") {
      pen.gable(0, 0, h, w, d, 2.0, "x", rng.pick(ROOF), { gable: wall });
      pen.gable(doorLeft ? w * 0.42 : 0.2, d - 2, h - 0.2, w * 0.5, 2.6, 1.7, "y", C.slate, { gable: wall });
    }
    pen.box(-0.32, d * 0.3, h, 0.64, 1.5, 1.25, style === "redbrick" ? C.brickDark : C.stockDark, { w: W_THIN, top: C.charcoal });
    for (const q of [0.5, 1.0]) pen.cyl(0, d * 0.3 + q, h + 1.25, 0.14, 0.34, C.tile, { seg: 6, w: 0.04 });
    // the end walls, where they show
    if (i === o.n - 1) {
      const g = pen.wall("x+", 0, 0, 0, w, d);
      windowGrid(g, rng, 1.0, ground + 0.3, d - 1.0, h - 1.0, 2, floors, { lit, trim, fillA: 0.42, fillB: 0.6 });
    }
    pen.end();
    pen.pop();
  }
  return o.n * w;
}

// ---------------------------------------------------------------- the pub

/** A pub on a corner: tiles and gold lettering below, brick above, hanging baskets, a painted sign. Fronts on +y and +x. */
export function pub(pen: Pen, rng: Rng, name: string, o: { w?: number; d?: number; floors?: number; tiles?: RGB } = {}): void {
  const w = o.w ?? 8;
  const d = o.d ?? 7;
  const floors = o.floors ?? 2;
  const tiles = o.tiles ?? rng.pick([C.ironGreen, C.doorRed, C.navy, C.black]);
  const h = 3.2 + floors * 2.5 + 0.5;
  pen.begin();
  pen.box(0, 0, 0, w, d, h, rng.pick([C.stock, C.brick, C.soot]), { top: C.charcoal });
  for (const side of ["y+", "x+"] as const) {
    const f = pen.wall(side, 0, 0, 0, w, d);
    const len = side === "y+" ? w : d;
    f.rect(0, 0, len, 3.2, tiles, { grain: 0.5, layer: -0.5 });
    f.rect(0, 2.45, len, 3.2, C.black, { outline: true, w: W_FINE, layer: 1, grain: 0.4 });
    if (side === "y+") f.text(name, len / 2, 2.66, Math.min(0.42, (len - 0.8) / name.length), { align: "c", color: C.gold, kind: L_MARK, w: 0.07, wobble: 0.3, layer: 2 });
    const n = Math.max(2, Math.round(len / 2.4));
    for (let k = 0; k < n; k++) {
      const a = 0.5 + (k * (len - 1)) / n;
      const ww = (len - 1) / n - 0.4;
      if (side === "y+" && k === Math.floor(n / 2)) f.rect(a, 0, a + ww, 2.2, C.woodDark, { outline: true, w: W_THIN, layer: 1 });
      else archWindow(f, a, 0.75, a + ww, 2.25, true, C.cream);
      // a hanging basket between each pair of windows
      const c = pen.card(side === "y+" ? a - 0.2 : w + 0.35, side === "y+" ? d + 0.35 : d - a + 0.2, 2.35);
      c.circle(0, 0, 0.34, C.leafDark, { seg: 8, outline: true, w: 0.04, sway: 0.06 });
      for (const [fa, fb] of [
        [-0.18, 0.12],
        [0.14, 0.16],
        [0, -0.1],
        [0.24, -0.06],
      ]) {
        c.circle(fa, fb, 0.1, rng.pick([C.red, C.pink, C.purple, C.yellow]), { seg: 5, layer: 1, grain: 0, sway: 0.06 });
      }
    }
    windowGrid(f, rng, 0.5, 3.6, len - 0.5, h - 0.8, Math.max(2, Math.round(len / 2.3)), floors, { lit: 0.6, trim: C.cream, fillA: 0.5, fillB: 0.66 });
    f.rect(0, h - 0.5, len, h - 0.22, C.cream, { grain: 0.3, layer: 1 });
  }
  // the painted sign on its bracket, and lamps to read the name by
  pen.pole([w - 0.2, d + 0.1, 4.6], [w - 0.2, d + 1.3, 4.6], 0.08, C.iron, { ink: false });
  const sg = pen.plane([w - 0.2, d + 0.25, 3.5], [0, 1, 0], [0, 0, 1], 0, true);
  sg.rect(0, 0, 0.95, 1.05, tiles, { outline: true, w: W_FINE, sway: 0.05 });
  sg.circle(0.47, 0.55, 0.26, C.gold, { layer: 1, seg: 8, grain: 0.2, sway: 0.05 });
  for (let a = 1; a < w; a += 1.6) {
    pen.stroke(
      [
        [a, d + 0.3, 3.3],
        [a + 0.03, d + 0.3, 3.3],
      ],
      { w: 0.3, kind: L_LIGHT, wobble: 0, alpha: 0.8 },
    );
  }
  pen.box(w * 0.6, d * 0.35, h, 0.7, 1.4, 1.2, C.stockDark, { w: W_THIN, top: C.charcoal });
  pen.end();
}

// ---------------------------------------------------------------- offices

export interface OfficeOpts {
  /** "glass": a curtain wall. "stone": Portland stone with regular windows. "brick": a warehouse. */
  style?: "glass" | "stone" | "brick";
  wall?: RGB;
  glass?: RGB;
  lit?: number;
  /** Size of one window bay. */
  bay?: number;
  storey?: number;
  /** Leave the top plain (for a roof terrace or a sign). */
  plant?: boolean;
}

/** A plain office block: `w` by `d` and `h` tall, standing at the origin. */
export function office(pen: Pen, rng: Rng, w: number, d: number, h: number, o: OfficeOpts = {}): void {
  const style = o.style ?? "stone";
  const wall = o.wall ?? (style === "glass" ? C.glassLight : style === "brick" ? C.stock : C.portland);
  const lit = o.lit ?? 0.5;
  const bay = o.bay ?? (style === "glass" ? 1.1 : 1.7);
  const storey = o.storey ?? (style === "glass" ? 1.5 : 2.3);
  pen.begin();
  pen.box(0, 0, 0, w, d, h, wall, { top: style === "glass" ? C.slateLight : C.stoneDark, glow: style === "glass" ? 0.25 : 0 });
  for (const side of ["y+", "x+"] as const) {
    const f = pen.wall(side, 0, 0, 0, w, d);
    const len = side === "y+" ? w : d;
    const cols = Math.max(1, Math.round((len - 0.6) / bay));
    const rows = Math.max(1, Math.round((h - 3.2) / storey));
    if (style === "glass") {
      f.rect(0.2, 0.3, len - 0.2, h - 0.3, o.glass ?? C.glass, { grain: 0.5, glow: 0.25, layer: -0.5 });
      for (let k = 1; k < cols; k++) f.seg(0.2 + (k * (len - 0.4)) / cols, 0.3, 0.2 + (k * (len - 0.4)) / cols, h - 0.3, { w: 0.05, color: C.glassPale, kind: L_MARK, wobble: 0, layer: 1 });
      for (let k = 1; k <= rows + 1; k++) {
        const b = 0.3 + (k * (h - 0.6)) / (rows + 2);
        f.seg(0.2, b, len - 0.2, b, { w: 0.05, color: C.glassPale, kind: L_MARK, wobble: 0, layer: 1 });
      }
      // a few floors still at their desks
      for (let k = 0; k < rows * cols * lit * 0.35; k++) {
        const q = rng.int(0, cols);
        const r = rng.int(0, rows + 2);
        f.rect(0.2 + (q * (len - 0.4)) / cols + 0.04, 0.3 + (r * (h - 0.6)) / (rows + 2) + 0.04, 0.2 + ((q + 1) * (len - 0.4)) / cols - 0.04, 0.3 + ((r + 1) * (h - 0.6)) / (rows + 2) - 0.04, C.glassLight, { glow: 1, layer: 1, grain: 0.3 });
      }
    } else {
      f.rect(0, 0, len, 2.8, style === "brick" ? C.stockDark : C.portlandDark, { grain: 0.7, layer: -0.5 });
      f.seg(0, 2.8, len, 2.8, { w: W_FINE });
      windowGrid(f, rng, 0.3, 0.5, len - 0.3, 2.6, cols, 1, { lit: 0.8, arched: style === "brick", trim: style === "brick" ? C.cream : C.portlandLight, fillA: 0.6, fillB: 0.8 });
      windowGrid(f, rng, 0.3, 3.0, len - 0.3, h - 0.5, cols, rows, { lit, trim: style === "brick" ? C.cream : C.portlandLight, fillA: 0.58, fillB: 0.64, bars: style !== "stone" });
      f.rect(0, h - 0.4, len, h, style === "brick" ? C.cream : C.portlandLight, { grain: 0.3, layer: 1 });
      f.seg(0, h - 0.4, len, h - 0.4, { w: W_FINE, layer: 1 });
      if (style === "brick") bricks(f, 0.2, 3.0, len - 0.2, h - 0.6, C.stockDark, 0.25);
    }
  }
  if (o.plant !== false) pen.box(w * 0.3, d * 0.3, h, w * 0.35, d * 0.35, 0.9, C.grey, { w: W_THIN, top: C.greyDark });
  pen.end();
}

/** A sign that is lit after dark: a coloured panel with lettering. */
export function neonSign(f: Plane, text: string, a: number, b: number, size: number, rgb: RGB, layer = 1): void {
  const w = text.length * size * 0.92 + size * 0.6;
  f.rect(a - w / 2, b - size * 0.35, a + w / 2, b + size * 1.35, rgb, { outline: true, w: W_FINE, glow: 1, kind: F_NEON, layer, grain: 0.2 });
  f.text(text, a, b, size, { align: "c", color: C.white, kind: L_MARK, w: Math.max(0.05, size * 0.16), wobble: 0.2, layer: layer + 1 });
}
