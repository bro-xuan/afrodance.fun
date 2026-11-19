// City West: Breitscheidplatz and the top of the Ku'damm. The broken tower
// of the Kaiser-Wilhelm-Gedächtniskirche stands at the back with nothing
// behind it but sky, left as the war left it; beside it the new church and
// its bell tower, walls of blue glass. Along the west side the Europa-Center
// with the emblem turning on its roof, a department store in the spirit of
// the KaDeWe, and a cinema with the carpet out: a premiere, and every flash
// going off as the camera arrives. In the far corner the Elephant Gate of the
// Zoo, and a giraffe who can see over the wall.
//
// East is local +x and south +y, so fronts face the square: the west side's
// buildings look east, the north side's look south.

import { RGB, Rng, V2, V3, hash1, mixRGB, scaleRGB } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { altbauRow, buddyBear, dog, flagOf, litfass, queue, sSign } from "../berlin";
import { uSign } from "../bridges";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, bench, bikeRow, cafeTable, lamp, person, randomLook, sweptRoof, tree, windowGrid } from "../kit";
import { Route, makeSprite, rounded, traveler, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;

/** The ruin's stone, blackened; the blue of the new church's glass, and the concrete that holds it. */
const RUIN: RGB = mixRGB(C.domStoneDark, C.charcoal, 0.28);
const RUIN_DARK: RGB = mixRGB(C.domStoneDark, C.charcoal, 0.6);
const GLASS_BLUE: RGB = [52, 96, 178];
const GLASS_DEEP: RGB = [36, 62, 132];
const GLASS_LIGHT: RGB = [104, 150, 214];
const GRID: RGB = [58, 62, 78];
const NIGHT_BLUE: RGB = [80, 140, 255];
const RED_GRANITE: RGB = [176, 100, 88];
const ELEPHANT: RGB = [170, 166, 158];
const ROOF_GREEN: RGB = [62, 142, 112];

/** Where the old tower stands, the new church, and the bell tower. */
const TX = 26;
const TY = 10;
const OX = 19.6;
const OY = 19.6;
const HX = 32.0;
const HY = 8.0;
/** The churches stand on a low plinth of their own. */
const PL = 0.25;
/** The carpet runs east from the cinema's doors along this line. */
const CARPET_Y = 29.0;

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

/** A plane on one flat side of a prism centred (cx, cy): the side between corner angles a0 and a1, from z up. a runs from the a0 corner. */
function side(pen: Pen, cx: number, cy: number, z: number, r: number, a0: number, a1: number, layer = 1): { f: Plane; w: number } {
  const p0: V3 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z];
  const dx = Math.cos(a1) * r - Math.cos(a0) * r;
  const dy = Math.sin(a1) * r - Math.sin(a0) * r;
  const w = Math.hypot(dx, dy);
  return { f: pen.plane(p0, [dx / w, dy / w, 0], [0, 0, 1], layer), w };
}

/** A wall of small squares of blue glass set in a grid of concrete; after dark it glows blue from inside. */
function glassWall(f: Plane, w: number, h: number, rng: Rng, cell = 0.52): void {
  if (!f.visible) return;
  f.rect(0, 0, w, h, GLASS_BLUE, { grain: 0.5, glow: 0.08 });
  const nx = Math.max(2, Math.round(w / cell));
  const ny = Math.max(2, Math.round(h / cell));
  // no two panes quite the same blue, and here and there a red or a gold one
  for (let k = 0; k < nx * ny * 0.3; k++) {
    const i = rng.int(0, nx);
    const j = rng.int(0, ny);
    const col = rng.chance(0.08) ? rng.pick([C.red, C.gold, C.green]) : rng.pick([GLASS_DEEP, GLASS_LIGHT, GLASS_DEEP, GLASS_LIGHT, C.blueDark]);
    f.rect((i * w) / nx, (j * h) / ny, ((i + 1) * w) / nx, ((j + 1) * h) / ny, col, { layer: 1, grain: 0.4, glow: 0.08 });
  }
  for (let i = 0; i <= nx; i++) f.seg((i * w) / nx, 0, (i * w) / nx, h, { w: 0.07, color: GRID, kind: L_MARK, wobble: 0, layer: 2 });
  for (let j = 0; j <= ny; j++) f.seg(0, (j * h) / ny, w, (j * h) / ny, { w: 0.07, color: GRID, kind: L_MARK, wobble: 0, layer: 2 });
  for (let j = 1; j < ny; j++) f.seg(0.3, (j * h) / ny, w - 0.3, (j * h) / ny, { w: (h / ny) * 2.2, color: NIGHT_BLUE, kind: L_SPARK, wobble: 0, alpha: 0.26, layer: 3 });
}

// ---------------------------------------------------------------- the Gedächtniskirche

/** The old tower: what was left standing in 1943, and kept that way. It goes up in stages and ends in a broken edge. */
function ruin(c: BlockCtx): void {
  const { pen } = c;
  const x = TX;
  const y = TY;
  // the entrance hall at its foot: three portals, a rose window
  pen.obj(() => {
    pen.box(x - 3.4, y - 3.4, PL, 6.8, 6.8, 6.0, RUIN);
    const f = pen.wall("y+", x - 3.4, y - 3.4, PL, 6.8, 6.8);
    for (const a of [1.1, 3.4, 5.7]) {
      const w = a === 3.4 ? 0.95 : 0.7;
      const top = a === 3.4 ? 2.6 : 2.1;
      const pts: V2[] = [
        [a - w, 0],
        [a + w, 0],
        [a + w, top],
      ];
      for (let k = 1; k < 6; k++) pts.push([a + Math.cos((k / 6) * Math.PI) * w, top + Math.sin((k / 6) * Math.PI) * w]);
      pts.push([a - w, top]);
      f.poly(pts, C.charcoal, { outline: true, w: W_FINE, grain: 0.6, glow: a === 3.4 ? 0.5 : 0 });
    }
    f.circle(3.4, 4.6, 0.95, RUIN_DARK, { outline: true, w: W_FINE, seg: 14, grain: 0.6 });
    for (let k = 0; k < 6; k++) f.seg(3.4, 4.6, 3.4 + Math.cos((k / 6) * Math.PI * 2) * 0.9, 4.6 + Math.sin((k / 6) * Math.PI * 2) * 0.9, { w: 0.05, color: RUIN, kind: L_MARK, wobble: 0, layer: 1 });
    f.seg(0, 5.55, 6.8, 5.55, { w: 0.06 });
    const g = pen.wall("x+", x - 3.4, y - 3.4, PL, 6.8, 6.8);
    for (const a of [1.3, 3.4, 5.5]) {
      const pts: V2[] = [
        [a - 0.55, 1.0],
        [a + 0.55, 1.0],
        [a + 0.55, 3.4],
      ];
      for (let k = 1; k < 6; k++) pts.push([a + Math.cos((k / 6) * Math.PI) * 0.55, 3.4 + Math.sin((k / 6) * Math.PI) * 0.55]);
      pts.push([a - 0.55, 3.4]);
      g.poly(pts, C.charcoal, { outline: true, w: W_FINE, grain: 0.6 });
    }
    g.seg(0, 5.55, 6.8, 5.55, { w: 0.06 });
    // soot, and the scars of that night
    for (const w of [f, g]) w.ticks(0.3, 0.4, 6.5, 5.4, { n: 34, len: 0.8, ang: Math.PI / 2, jit: 0.4, color: RUIN_DARK, w: 0.07, layer: 1 });
  });
  // the shaft: tall blind arches, and a clock that still goes
  const z1 = PL + 6.0;
  pen.obj(() => {
    pen.box(x - 2.3, y - 2.3, z1, 4.6, 4.6, 8.2, RUIN);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, x - 2.3, y - 2.3, z1, 4.6, 4.6);
      for (const a of [1.25, 3.35]) {
        const pts: V2[] = [
          [a - 0.6, 0.5],
          [a + 0.6, 0.5],
          [a + 0.6, 3.6],
        ];
        for (let k = 1; k < 6; k++) pts.push([a + Math.cos((k / 6) * Math.PI) * 0.6, 3.6 + Math.sin((k / 6) * Math.PI) * 0.6]);
        pts.push([a - 0.6, 3.6]);
        f.poly(pts, RUIN_DARK, { outline: true, w: W_FINE, grain: 0.6 });
      }
      f.circle(2.3, 6.25, 1.25, C.charcoal, { layer: 1, seg: 18, grain: 0.4 });
      f.circle(2.3, 6.25, 1.05, C.white, { outline: true, w: W_FINE, layer: 2, seg: 18, grain: 0.3, glow: 0.5 });
      f.seg(2.3, 6.25, 2.3 - 0.45, 6.25 + 0.4, { w: 0.11, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      f.seg(2.3, 6.25, 2.3 + 0.6, 6.25 + 0.55, { w: 0.08, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      f.seg(0, 4.9, 4.6, 4.9, { w: 0.06 });
      f.ticks(0.3, 0.3, 4.3, 8.0, { n: 30, len: 0.8, ang: Math.PI / 2, jit: 0.4, color: RUIN_DARK, w: 0.07, layer: 1 });
    }
  }, 0.14);
  // the octagonal stage, open arches all round
  const z2 = z1 + 8.2;
  const oct: V2[] = [];
  for (let k = 0; k < 8; k++) oct.push([x + Math.cos(Math.PI / 8 + (k * Math.PI) / 4) * 2.45, y + Math.sin(Math.PI / 8 + (k * Math.PI) / 4) * 2.45]);
  pen.obj(() => {
    pen.box(x - 2.5, y - 2.5, z2 - 0.05, 5.0, 5.0, 0.35, RUIN_DARK);
    pen.extrude(oct, z2 + 0.3, z2 + 4.3, RUIN, { crease: 30 });
    for (const k of [-1, 0, 1, 2]) {
      const a0 = Math.PI / 8 + (k * Math.PI) / 4;
      const { f, w } = side(pen, x, y, z2 + 0.3, 2.45, a0, a0 + Math.PI / 4);
      const m = w / 2;
      const pts: V2[] = [
        [m - 0.48, 0.6],
        [m + 0.48, 0.6],
        [m + 0.48, 2.6],
      ];
      for (let q = 1; q < 6; q++) pts.push([m + Math.cos((q / 6) * Math.PI) * 0.48, 2.6 + Math.sin((q / 6) * Math.PI) * 0.48]);
      pts.push([m - 0.48, 2.6]);
      f.poly(pts, C.charcoal, { outline: true, w: W_FINE, grain: 0.6 });
    }
  }, 0.3);
  // and the spire, snapped off: a jagged rim round a black hollow
  const z3 = z2 + 4.3;
  const tops = [4.7, 2.1, 5.4, 2.9, 4.1, 1.7, 3.5, 2.5];
  pen.obj(() => {
    const verts: V3[] = [];
    for (let k = 0; k < 8; k++) verts.push([oct[k][0], oct[k][1], z3]);
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      const r = 2.45 - tops[k] * 0.26;
      verts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z3 + tops[k]]);
    }
    const faces: number[][] = [];
    const cols: RGB[] = [];
    for (let k = 0; k < 8; k++) {
      const j = (k + 1) % 8;
      faces.push([k, j, 8 + j, 8 + k]);
      cols.push(RUIN);
    }
    faces.push([8, 9, 10, 11, 12, 13, 14, 15]);
    cols.push(C.black);
    pen.solid(verts, faces, cols, { crease: 20 });
  }, 0.46);
}

/** The new church: a low octagon of blue glass, flat-roofed, a gold cross over its door. */
function octagon(c: BlockCtx): void {
  const { pen, rng } = c;
  const r = 5;
  const h = 6.4;
  pen.obj(() => {
    pen.cyl(OX, OY, PL, r, h, GLASS_BLUE, { seg: 8, top: C.concreteDark });
    for (const k of [-1, 0, 1, 2]) {
      const a0 = (k * Math.PI) / 4;
      const { f, w } = side(pen, OX, OY, PL, r, a0, a0 + Math.PI / 4);
      glassWall(f, w, h, rng);
      if (k === 1) {
        f.rect(w / 2 - 0.7, 0, w / 2 + 0.7, 2.3, C.charcoal, { outline: true, w: W_THIN, layer: 4, glow: 0.5 });
        f.seg(w / 2, 2.6, w / 2, 3.7, { w: 0.13, color: C.gold, kind: L_MARK, wobble: 0, layer: 4 });
        f.seg(w / 2 - 0.38, 3.3, w / 2 + 0.38, 3.3, { w: 0.13, color: C.gold, kind: L_MARK, wobble: 0, layer: 4 });
      }
    }
  });
  pen.obj(() => pen.cyl(OX, OY, PL + h, 2.6, 0.5, C.concrete, { seg: 8, top: C.glassPale }), 0.15);
}

/** The new bell tower: a tall thin hexagon of the same glass, a gold cross on top. */
function bellTower(c: BlockCtx): void {
  const { pen, rng } = c;
  const r = 1.9;
  const h = 17;
  pen.obj(() => {
    pen.cyl(HX, HY, PL, r, h, GLASS_BLUE, { seg: 6, top: C.concreteDark });
    for (const k of [-1, 0, 1]) {
      const a0 = (k * Math.PI) / 3;
      const { f, w } = side(pen, HX, HY, PL, r, a0, a0 + Math.PI / 3);
      glassWall(f, w, h, rng, 0.48);
    }
  }, 0.1);
  pen.obj(() => {
    const cd = pen.card(HX, HY, PL + h);
    cd.bar(0, 0, 0, 2.3, 0.16, C.gold);
    cd.bar(-0.7, 1.55, 0.7, 1.55, 0.16, C.gold);
  }, 0.32);
}

// ---------------------------------------------------------------- the west side

/** The Europa-Center: a slab of offices over a shopping arcade. Its roof carries the emblem (drawn by a mover). */
function europaCenter(c: BlockCtx, x0: number, y0: number, w: number, d: number, h: number): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.concrete, { top: C.concreteDark });
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, x0, y0, 0, w, d);
      const len = sd === "x+" ? d : w;
      f.rect(0, 0, len, 2.6, C.glassLight, { outline: true, w: W_FINE, glow: 0.8, grain: 0.5 });
      for (let a = 1.3; a < len - 0.5; a += 1.3) f.seg(a, 0, a, 2.6, { w: 0.05, wobble: 0, layer: 1 });
      f.rect(0, 2.6, len, 3.1, C.charcoal, { grain: 0.5, layer: 1 });
      windowGrid(f, rng, 0.2, 3.3, len - 0.2, h - 0.5, 7, 13, { lit: 0.55, trim: C.concreteDark, fillA: 0.84, fillB: 0.66, bars: false });
    }
  });
  // plant rooms on the roof, and the mast the emblem turns on
  pen.obj(() => {
    pen.box(x0 + 1.6, y0 + 1.6, h, w - 3.2, d - 3.2, 1.2, C.concreteDark, { w: W_THIN });
    pen.pole([x0 + w / 2, y0 + d / 2, h + 1.2], [x0 + w / 2, y0 + d / 2, h + 3.0], 0.3, C.metal);
  }, 0.16);
}

/** A department store in the spirit of the KaDeWe: seven floors of pale stone, arched windows on the street, a glass barrel on the roof. Faces east. */
function store(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen, rng } = c;
  const h = 15.2;
  const stone = C.sandstoneLight;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, stone);
    const f = pen.wall("x+", x0, y0, 0, w, d);
    f.rect(0, 0, d, 3.3, C.sandstone, { grain: 0.6 });
    const n = 5;
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.5) * d) / n;
      const pts: V2[] = [
        [a - 0.78, 0.35],
        [a + 0.78, 0.35],
        [a + 0.78, 1.9],
      ];
      for (let q = 1; q < 6; q++) pts.push([a + Math.cos((q / 6) * Math.PI) * 0.78, 1.9 + Math.sin((q / 6) * Math.PI) * 0.78]);
      pts.push([a - 0.78, 1.9]);
      f.poly(pts, k === 2 ? C.charcoal : C.glassLight, { outline: true, w: W_THIN, glow: 0.85, layer: 1 });
    }
    f.rect(0, 3.3, d, 3.6, C.sandstoneDark, { grain: 0.4, layer: 1 });
    windowGrid(f, rng, 0.35, 3.9, d - 0.35, h - 1.9, 9, 5, { lit: 0.7, trim: C.white, fillA: 0.6, fillB: 0.62 });
    // the name, in gold, on a dark band under the cornice
    f.rect(0, h - 1.75, d, h - 0.35, C.door, { grain: 0.5, layer: 1 });
    f.text("KADEWE", d / 2, h - 1.42, 0.78, { align: "c", color: C.gold, kind: L_MARK, w: 0.12, wobble: 0.2, layer: 2 });
    f.rect(0, h - 0.35, d, h, C.sandstone, { grain: 0.4, layer: 1 });
    const g = pen.wall("y+", x0, y0, 0, w, d);
    g.rect(0, 0, w, 3.3, C.sandstone, { grain: 0.6 });
    g.rect(0.6, 0.5, w - 0.6, 2.7, C.glassLight, { outline: true, w: W_THIN, glow: 0.85, layer: 1 });
    g.rect(0, 3.3, w, 3.6, C.sandstoneDark, { grain: 0.4, layer: 1 });
    windowGrid(g, rng, 0.35, 3.9, w - 0.35, h - 0.6, 6, 6, { lit: 0.65, trim: C.white, fillA: 0.6, fillB: 0.62 });
  });
  // awnings over the windows on the street
  pen.obj(() => {
    const n = 5;
    for (let k = 0; k < n; k++) {
      if (k === 2) continue;
      const a = y0 + d - ((k + 0.5) * d) / n;
      const aw = pen.plane([x0 + w, a + 0.9, 2.95], [0, -1, 0], [1.0, 0, -0.5], 0, true);
      for (let q = 0; q < 4; q++) aw.rect(q * 0.45, 0, (q + 1) * 0.45, 0.9, q % 2 ? C.white : C.ochre, { grain: 0.6 });
      aw.loop(
        [
          [0, 0],
          [1.8, 0],
          [1.8, 0.9],
          [0, 0.9],
        ],
        { w: W_THIN },
      );
    }
  }, 0.1);
  // the glazed barrel along the roof
  pen.obj(() => {
    const r = w / 2 - 1.2;
    const prof: V2[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = Math.PI - (k / 10) * Math.PI;
      prof.push([r + Math.cos(t) * r, Math.sin(t) * r * 0.85]);
    }
    pen.wall("y+", x0 + 1.2, y0 + 0.9, h, 2 * r, 0).extrude(prof, d - 1.8, C.glassPale, { crease: 30, glow: 0.4, grain: 0.4 });
    for (let yy = y0 + 0.9; yy <= y0 + d - 0.9 + 1e-6; yy += (d - 1.8) / 7) {
      const rib: V3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = Math.PI - (k / 10) * Math.PI;
        rib.push([x0 + 1.2 + r + Math.cos(t) * r, yy, h + Math.sin(t) * r * 0.85 + 0.02]);
      }
      pen.stroke(rib, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0 });
    }
  }, 0.2);
}

/** The Zoo Palast: a cinema front all sign and glass doors, with a canopy for the bulbs. Faces east. */
function cinema(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen } = c;
  const h = 8.6;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.palace, { top: C.stoneDark });
    const f = pen.wall("x+", x0, y0, 0, w, d);
    // a row of glass doors, lit from inside
    f.rect(0.5, 0, d - 0.5, 2.5, C.glassLight, { outline: true, w: W_THIN, glow: 0.9 });
    for (let a = 1.45; a < d - 0.6; a += 0.95) f.seg(a, 0, a, 2.5, { w: 0.05, wobble: 0, layer: 1 });
    // this week's films
    for (const [a, col] of [
      [0.7, C.red],
      [d - 1.9, C.teal],
    ] as [number, RGB][]) {
      f.rect(a, 3.5, a + 1.2, 5.3, col, { outline: true, w: W_FINE, layer: 1, glow: 0.3 });
      f.seg(a + 0.25, 4.6, a + 0.95, 4.6, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.3, layer: 2 });
      f.seg(a + 0.25, 4.15, a + 0.75, 4.15, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0.3, layer: 2 });
    }
    // the name, on a dark red board ringed with bulbs
    f.rect(1.0, 5.9, d - 1.0, 7.9, C.redDark, { outline: true, w: W_THIN, layer: 1 });
    f.text("ZOO PALAST", d / 2, 6.55, 0.72, { align: "c", color: C.lamp, kind: L_MARK, w: 0.11, wobble: 0.2, layer: 2 });
    for (let a = 1.2; a <= d - 1.2 + 1e-6; a += (d - 2.4) / 12) {
      for (const b of [6.08, 7.72]) {
        f.seg(a - 0.03, b, a + 0.03, b, { w: 0.14, color: C.lamp, kind: L_MARK, wobble: 0, layer: 2 });
        f.seg(a - 0.02, b, a + 0.02, b, { w: 0.34, kind: L_LIGHT, wobble: 0, layer: 3 });
      }
    }
    const g = pen.wall("y+", x0, y0, 0, w, d);
    g.rect(0.8, 3.4, w - 0.8, 6.6, C.stone, { outline: true, w: W_FINE, grain: 0.5 });
  });
  // the canopy over the doors, bulbs along its edge
  pen.obj(() => {
    pen.box(x0 + w, y0 + 0.2, 2.8, 1.7, d - 0.4, 0.3, C.redDark, { w: W_THIN });
    const e = pen.wall("x+", x0 + w, y0 + 0.2, 2.8, 1.7, d - 0.4);
    for (let a = 0.3; a < d - 0.6; a += 0.55) e.seg(a - 0.02, 0.15, a + 0.02, 0.15, { w: 0.3, kind: L_LIGHT, wobble: 0, layer: 1 });
  }, 0.14);
}

// ---------------------------------------------------------------- the north side

/** A corner café in the spirit of the Kranzler: two low floors, and on the roof a round pavilion under a red-and-white striped awning. */
function rotunda(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen, rng } = c;
  const h = 6.2;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.white, { top: C.stone });
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.rect(0.4, 0.4, w - 0.4, 2.6, C.glassLight, { outline: true, w: W_THIN, glow: 0.85 });
    for (let a = 1.6; a < w - 0.6; a += 1.3) f.seg(a, 0.4, a, 2.6, { w: 0.05, wobble: 0, layer: 1 });
    f.rect(0, 2.9, w, 3.25, C.red, { grain: 0.5 });
    f.text("CAFÉ", w / 2, 5.25, 0.5, { align: "c", color: C.red, kind: L_MARK, w: 0.09, wobble: 0.2 });
    windowGrid(f, rng, 0.4, 3.5, w - 0.4, 5.1, 5, 1, { lit: 0.8, trim: C.stone, fillA: 0.7, fillB: 0.8, bars: false });
    const g = pen.wall("x+", x0, y0, 0, w, d);
    g.rect(0.4, 0.4, d - 0.4, 2.6, C.glassLight, { outline: true, w: W_THIN, glow: 0.85 });
    g.rect(0, 2.9, d, 3.25, C.red, { grain: 0.5 });
    windowGrid(g, rng, 0.4, 3.5, d - 0.4, 5.1, 5, 1, { lit: 0.8, trim: C.stone, fillA: 0.7, fillB: 0.8, bars: false });
  });
  // the awning over the pavement
  pen.obj(() => {
    const aw = pen.plane([x0 + 0.3, y0 + d, 2.95], [1, 0, 0], [0, 1.0, -0.42], 0, true);
    const n = 10;
    const len = w - 0.6;
    for (let k = 0; k < n; k++) aw.rect((k * len) / n, 0, ((k + 1) * len) / n, 1.1, k % 2 ? C.white : C.red, { grain: 0.6 });
    aw.loop(
      [
        [0, 0],
        [len, 0],
        [len, 1.1],
        [0, 1.1],
      ],
      { w: W_THIN },
    );
  }, 0.1);
  // the pavilion on the roof terrace: glass all round, the striped cone over it, and people who got a table
  const cx = x0 + w / 2;
  const cy = y0 + d / 2 + 0.3;
  pen.obj(() => {
    pen.cyl(cx, cy, h, 2.3, 2.1, C.glassPale, { seg: 14, grain: 0.4, glow: 0.6 });
    const rim: V3[] = [];
    const n = 16;
    for (let k = 0; k < n; k++) rim.push([cx + Math.cos((k / n) * Math.PI * 2) * 3.2, cy + Math.sin((k / n) * Math.PI * 2) * 3.2, h + 2.05]);
    const apex: V3 = [cx, cy, h + 3.25];
    pen.cone(cx, cy, h + 2.05, 3.2, 1.2, C.white, { seg: n });
    for (let k = 0; k < n; k += 2) pen.fill([rim[k], rim[(k + 1) % n], apex], C.red, { bias: 0.03, grain: 0.6 });
    pen.pole(apex, [cx, cy, h + 4.0], 0.07, C.gold, { ink: false });
  }, 0.22);
  for (const [dx, dy, fl] of [
    [2.9, 1.3, true],
    [3.2, -0.6, false],
    [-0.4, 3.0, true],
    [1.6, 2.7, false],
  ] as [number, number, boolean][]) {
    person(pen, cx + dx * 0.92, cy + dy * 0.92, h + 0.05, randomLook(rng), "bust", fl);
  }
}

/** A stone elephant, kneeling, facing local +y, a red cloth on its back to carry the gate. */
function elephant(pen: Pen, x: number, y: number): void {
  const g = ELEPHANT;
  pen.obj(() => {
    pen.box(x - 0.95, y - 1.7, 0, 1.9, 3.0, 2.1, g);
    pen.box(x - 0.85, y + 0.5, 0, 0.55, 1.2, 0.55, g, { w: W_THIN });
    pen.box(x + 0.3, y + 0.5, 0, 0.55, 1.2, 0.55, g, { w: W_THIN });
    pen.box(x - 0.75, y + 1.0, 0.75, 1.5, 1.15, 1.65, g);
    pen.dome(x, y + 1.55, 2.4, 0.78, 0.5, g, { seg: 10, rings: 3 });
    // big ears, flat against the head
    for (const s of [-1, 1]) {
      const ear = pen.card(x + s * 1.02, y + 1.35, 1.0);
      ear.ellipse(s * 0.1, 0.72, 0.42, 0.66, scaleRGB(g, 0.9), { outline: true, w: W_FINE, seg: 10, layer: s < 0 ? 0 : 6 });
    }
    const trunk: V3[] = [
      [x, y + 2.15, 1.5],
      [x, y + 2.55, 0.8],
      [x, y + 2.85, 0.4],
      [x, y + 3.2, 0.62],
    ];
    pen.stroke(trunk, { w: 0.44, color: C.ink, kind: L_BAR, wobble: 0 });
    pen.stroke(trunk, { w: 0.33, color: g, kind: L_BAR, wobble: 0, bias: 0.012 });
    for (const s of [-1, 1]) {
      pen.stroke(
        [
          [x + s * 0.42, y + 2.16, 1.1],
          [x + s * 0.52, y + 2.75, 0.92],
        ],
        { w: 0.13, color: C.white, kind: L_BAR, wobble: 0 },
      );
    }
    const f = pen.wall("y+", x - 0.75, y + 1.0, 0.75, 1.5, 1.15);
    f.seg(0.32, 1.05, 0.32, 1.25, { w: 0.13, wobble: 0 });
    f.seg(1.18, 1.05, 1.18, 1.25, { w: 0.13, wobble: 0 });
    // the cloth
    pen.box(x - 1.0, y - 1.25, 2.1, 2.0, 1.9, 0.14, C.red, { w: W_THIN });
    const cl = pen.wall("x+", x - 1.0, y - 1.25, 1.3, 2.0, 1.9);
    cl.rect(0, 0, 1.9, 0.8, C.red, { outline: true, w: W_FINE, layer: 1 });
    cl.seg(0.1, 0.12, 1.8, 0.12, { w: 0.1, color: C.gold, kind: L_MARK, wobble: 0, layer: 2 });
  });
}

/** The Elephant Gate: two elephants carry a green-tiled roof with turned-up eaves on red posts; behind it the Zoo's wall. */
function zooGate(c: BlockCtx, gx: number, gy: number): void {
  const { pen, rng } = c;
  // the wall, with the tops of the Zoo's trees over it
  pen.obj(() => {
    pen.box(33.8, gy - 2.5, 0, B - E - 33.8, 0.45, 2.7, C.sandstone);
    const f = pen.wall("y+", 33.8, gy - 2.5, 0, B - E - 33.8, 0.45);
    f.ticks(0.2, 0.2, B - E - 34.0, 2.5, { n: 30, len: 0.6, ang: 0, jit: 0.02, color: C.sandstoneDark, w: 0.06 });
  });
  for (const x of [34.6, 36.4, 38.4]) tree(pen, rng, x, gy - 3.0, { kind: "round", h: 2.0, r: 1.4 });
  elephant(pen, gx - 2.2, gy);
  elephant(pen, gx + 2.2, gy);
  // red posts on their backs, a red beam, and the roof
  pen.obj(() => {
    for (const s of [-1, 1]) {
      for (const o of [-0.6, 0.6]) pen.cyl(gx + s * 2.2, gy + o - 0.3, 2.24, 0.24, 2.5, C.red, { seg: 7 });
    }
    pen.box(gx - 3.0, gy - 1.15, 4.74, 6.0, 1.7, 0.42, C.redDark);
    const f = pen.wall("y+", gx - 3.0, gy - 1.15, 4.74, 6.0, 1.7);
    f.rect(1.9, -0.95, 4.1, -0.05, C.red, { outline: true, w: W_FINE, layer: 1 });
    f.text("ZOO", 3.0, -0.72, 0.5, { align: "c", color: C.gold, kind: L_MARK, w: 0.1, wobble: 0.2, layer: 2 });
    for (let a = 0.3; a < 5.9; a += 0.5) f.seg(a, 0.08, a, 0.34, { w: 0.12, color: C.gold, kind: L_MARK, wobble: 0, layer: 1 });
  }, 0.16);
  pen.obj(() => sweptRoof(pen, gx, gy - 0.3, 5.16, { hx: 4.3, hy: 1.9, tx: 2.6, ty: 0.25, rise: 1.7, lift: 0.95, tile: ROOF_GREEN, tileDark: scaleRGB(ROOF_GREEN, 0.7), fascia: C.red }), 0.3);
  // flamingos, seen through the gate
  pen.obj(() => {
    for (const [dx, fl] of [
      [-0.5, false],
      [0.45, true],
    ] as [number, boolean][]) {
      const cd = pen.card(gx + dx, gy - 1.6, 0, fl);
      cd.bar(0, 0, 0, 0.95, 0.05, C.pink);
      cd.ellipse(0, 1.15, 0.36, 0.24, C.pink, { outline: true, w: W_FINE, seg: 9, layer: 1 });
      cd.line(
        [
          [0.25, 1.25],
          [0.5, 1.6],
          [0.38, 1.95],
          [0.55, 2.02],
        ],
        { w: 0.09, color: C.pink, kind: L_BAR, wobble: 0 },
      );
      cd.seg(0.55, 2.02, 0.66, 1.9, { w: 0.08, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
    }
  });
  // the ticket office, the queue, and a keeper
  pen.obj(() => {
    pen.box(gx - 4.55, gy + 2.7, 0, 1.9, 1.7, 2.4, C.green, { top: C.zinc });
    const f = pen.wall("y+", gx - 4.55, gy + 2.7, 0, 1.9, 1.7);
    f.rect(0.3, 1.0, 1.6, 1.95, C.glass, { outline: true, w: W_FINE, glow: 0.7 });
    f.text("KASSE", 0.95, 2.05, 0.24, { align: "c", color: C.white, kind: L_MARK, w: 0.05 });
  });
  queue(pen, rng, gx - 2.2, gy + 4.8, 8, 0.4, 1);
  person(pen, gx + 3.6, gy + 2.8, 0, { ...randomLook(rng), top: C.green, legs: C.green, hat: C.green }, "stand", true);
}

// ---------------------------------------------------------------- the square

/** The Weltkugelbrunnen, the "Wasserklops": a globe of red granite, split, in a round basin, water running everywhere. */
function globeFountain(c: BlockCtx, x: number, y: number): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.cyl(x, y, 0, 3.4, 0.2, C.stoneDark, { seg: 20 });
    pen.cyl(x, y, 0.2, 2.95, 0.34, mixRGB(RED_GRANITE, C.white, 0.25), { seg: 20 });
    pen.floor(0.55, 1).circle(x, y, 2.6, C.water, { kind: F_WATER, seg: 18, outline: true, w: W_FINE, ink: C.waterInk });
    pen.dome(x, y, 0.5, 1.75, 1.95, RED_GRANITE, { seg: 14, rings: 4 });
    // the cleft across the globe, and the water that runs down out of it
    const cleft: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = (k / 8) * Math.PI;
      cleft.push([x + Math.cos(t) * 1.78 * 0.55, y - Math.cos(t) * 1.78 * 0.55 + 0.3, 0.5 + Math.sin(t) * 1.97]);
    }
    pen.stroke(cleft, { w: 0.2, color: scaleRGB(RED_GRANITE, 0.55), kind: L_MARK, wobble: 0.3 });
    for (const [dx, dy] of [
      [1.2, 0.5],
      [0.4, 1.4],
      [1.5, -0.6],
      [-0.6, 1.5],
    ]) {
      pen.stroke(
        [
          [x + dx * 0.55, y + dy * 0.55, 1.75],
          [x + dx * 0.9, y + dy * 0.9, 1.3],
          [x + dx * 1.25, y + dy * 1.25, 0.58],
        ],
        { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.5, sway: 0.2, alpha: 0.9 },
      );
    }
    // bronze figures here and there on the rim
    for (const a of [0.2, 1.3, 2.4]) {
      const cd = pen.card(x + Math.cos(a) * 2.75, y + Math.sin(a) * 2.75, 0.54);
      const bz: RGB = [96, 108, 92];
      cd.poly(
        [
          [-0.22, 0],
          [0.22, 0],
          [0.16, 0.6],
          [-0.16, 0.6],
        ],
        bz,
        { outline: true, w: W_FINE },
      );
      cd.circle(0, 0.78, 0.17, bz, { outline: true, w: W_FINE, seg: 7, layer: 1 });
    }
  });
  // children who are going to get wet
  for (const [a, pose] of [
    [-0.3, "cheer"],
    [0.75, "stand"],
    [1.85, "wave"],
    [2.9, "stand"],
  ] as [number, "cheer" | "stand" | "wave"][]) {
    person(pen, x + Math.cos(a) * 3.75, y + Math.sin(a) * 3.75, 0, randomLook(rng), pose, Math.cos(a) > 0, 0.72);
  }
  person(pen, x + 3.2, y + 2.9, 0, randomLook(rng), "stand", true);
}

/** A glass showcase on a post: the shops put their best things out on the pavement. */
function vitrine(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.obj(() => {
    pen.pole([x, y, 0], [x, y, 0.6], 0.14, C.greyDark);
    pen.box(x - 0.42, y - 0.42, 0.6, 0.84, 0.84, 1.25, C.glassPale, { w: W_FINE, grain: 0.3, glow: 0.6 });
    const col = rng.pick([C.red, C.gold, C.purple, C.teal, C.pink]);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, x - 0.42, y - 0.42, 0.6, 0.84, 0.84);
      f.rect(0.26, 0.2, 0.58, 0.8, col, { layer: 1, grain: 0.4 });
    }
    pen.box(x - 0.48, y - 0.48, 1.85, 0.96, 0.96, 0.1, C.charcoal, { w: W_FINE });
  });
}

/** Somebody on a skateboard: two frames, pushing and rolling. */
function skater(pen: Pen, look: Look, frame: number, flip: boolean): void {
  person(pen, 0, 0, 0.16, look, frame ? "walkA" : "walkB", flip);
  const cd = pen.card(0, 0, 0, flip);
  cd.bar(-0.55, 0.14, 0.55, 0.14, 0.09, C.orange);
  cd.circle(-0.34, 0.06, 0.07, C.black, { seg: 6, layer: 1, grain: 0 });
  cd.circle(0.34, 0.06, 0.07, C.black, { seg: 6, layer: 1, grain: 0 });
}

/** A pigeon on the wing: wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

// ---------------------------------------------------------------- the place

export const citywest: BlockBuilder = (c) => {
  const { pen, rng } = c;
  // the emblem on the Europa-Center turns well above the roofs: stand back far enough to keep it in
  c.focus(20.5, 19.5, 0.9);

  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E, E, B - E, B - E, C.plaza);
    // the square's paving, in bands
    for (let y = 15; y < B - E; y += 3) g.seg(13.2, y, B - E - 0.1, y, { w: 0.06, color: C.stoneDark, kind: L_MARK, wobble: 0.3, layer: 1 });
    pen.floor(0, 2).ticks(E + 0.4, E + 0.4, B - E - 0.4, B - E - 0.4, { n: 150, len: 0.3, ang: -0.78, jit: 0.2, color: C.stoneDark, w: 0.06 });
    // the churches' plinth
    pen.extrude(
      [
        [21.6, 5.6],
        [34.6, 5.6],
        [34.6, 11.2],
        [30.4, 14.4],
        [25.8, 14.4],
        [25.8, 25.6],
        [13.8, 25.6],
        [13.8, 13.6],
        [21.6, 13.6],
      ],
      0,
      PL,
      C.cobble,
      { top: C.cobble, w: W_THIN },
    );
    // the carpet
    g.rect(12.7, CARPET_Y - 0.8, 21.6, CARPET_Y + 0.8, C.red, { outline: true, w: W_FINE, grain: 0.5, layer: 2 });
  });

  // ---- the north side: the café, the old tower, the bell tower, the Zoo's gate
  rotunda(c, 13.4, E + 0.2, 7.6, 7.6);
  ruin(c);
  bellTower(c);
  zooGate(c, 39.2, 8.6);
  // ---- the new church, in front of them
  octagon(c);

  // ---- the west side: the Europa-Center in the corner, the store, the cinema, two houses
  europaCenter(c, E + 0.2, E + 0.2, 8, 8, 19);
  store(c, E + 0.2, 13.4, 8, 11);
  cinema(c, E + 0.2, 25.0, 8, 8);
  pen.push(E + 0.2, B - E, 0, 270);
  altbauRow(pen, rng, 2, { widths: [5.2, 5.0], shops: ["flowers", "books"], graffiti: 0, end: "windows" });
  pen.pop();

  // ---- the square
  globeFountain(c, 29.5, 32.5);
  litfass(pen, rng, 23.6, 27.3);
  vitrine(pen, rng, 13.5, 14.2);
  vitrine(pen, rng, 13.4, 24.4);
  buddyBear(pen, 33.6, 15.4, C.green);
  buddyBear(pen, 17.6, 40.6, C.pink, 0, true);
  for (const [x, y] of [
    [24.8, 39.2],
    [32.6, 40.0],
    [41.0, 31.2],
    [40.9, 21.4],
    [35.4, 21.6],
  ]) {
    tree(pen, rng, x, y, { kind: "elm", h: 2.6, r: 1.7 });
  }
  for (const [x, y] of [
    [16.2, 26.6],
    [22.8, 36.4],
    [34.2, 26.8],
    [28.6, 41.0],
    [38.6, 33.6],
  ]) {
    lamp(pen, x, y, 0, 3.2);
  }
  for (let k = 0; k < 3; k++) cafeTable(pen, rng, [37.4, 40.2, 40.0][k], [40.4, 38.4, 40.9][k], k === 1 ? C.red : C.white, 2 + (k % 2));
  bench(pen, 26.4, 38.2, 0);
  person(pen, 26.0, 38.4, 0.3, randomLook(rng), "sit", false);
  person(pen, 26.9, 38.4, 0.3, randomLook(rng), "sit", true);
  bench(pen, 33.6, 37.0, 180);

  // Bahnhof Zoo is just round the corner
  sSign(pen, 43.0, 13.4, 0);
  uSign(pen, 43.0, 16.6, 0);
  bikeRow(pen, rng, 15.6, 41.6, 6, 270, 0.62);
  // a pretzel seller, his basket on a handcart
  pen.obj(() => {
    pen.box(20.0, 37.2, 0.5, 1.5, 0.9, 0.5, C.wood, { w: W_FINE });
    for (const o of [0.25, 1.25]) pen.cyl(20.0 + o, 38.14, 0.05, 0.42, 0.07, C.woodDark, { seg: 8 });
    for (let k = 0; k < 6; k++) pen.cyl(20.25 + (k % 3) * 0.5, 37.45 + Math.floor(k / 3) * 0.4, 1.0, 0.17, 0.1, C.ochre, { seg: 6, w: W_FINE });
    const sg = pen.card(20.75, 37.2, 0);
    sg.bar(-0.7, 1.0, -0.7, 2.4, 0.06, C.woodDark);
    sg.bar(0.7, 1.0, 0.7, 2.4, 0.06, C.woodDark);
    sg.rect(-0.95, 2.0, 0.95, 2.6, C.cream, { outline: true, w: W_FINE, layer: 1 });
    sg.text("BREZELN", 0, 2.16, 0.26, { align: "c", layer: 2, w: 0.05 });
  });
  person(pen, 19.6, 37.7, 0, { ...randomLook(rng), top: C.white, hat: C.white }, "stand", false);
  person(pen, 21.3, 38.8, 0, randomLook(rng), "stand", true);
  person(pen, 20.4, 39.0, 0, randomLook(rng), "wave", true, 0.72);
  // a living statue: silver from head to foot on a silver box, not moving, and three people waiting for him to
  const silver: RGB = [196, 200, 204];
  pen.obj(() => pen.box(19.75, 32.55, 0, 0.9, 0.9, 0.7, silver, { w: W_THIN }));
  person(pen, 20.2, 33.0, 0.7, { skin: silver, hair: silver, top: silver, legs: silver, long: false, hat: silver }, "wave", false);
  person(pen, 21.4, 33.4, 0, randomLook(rng), "stand", true);
  person(pen, 20.9, 34.0 - 0.45, 0, randomLook(rng), "stand", true, 0.72);
  person(pen, 18.9, 33.5, 0, randomLook(rng), "stand", false);
  // pigeons, wherever somebody dropped a crumb
  for (const [x, y, fl] of [
    [27.2, 37.4, false],
    [27.9, 37.9, true],
    [25.0, 36.6, false],
    [33.0, 28.0, true],
    [22.4, 37.9, false],
    [30.6, 26.6, true],
  ] as [number, number, boolean][]) {
    const cd = pen.card(x, y, 0, fl);
    pen.obj(() => {
      cd.ellipse(0, 0.16, 0.2, 0.13, C.metal, { outline: true, w: W_FINE, seg: 7 });
      cd.circle(0.17, 0.3, 0.08, C.slate, { seg: 5, layer: 1, grain: 0 });
    });
  }
  // flags over the store
  flagOf(pen, E + 0.9, 14.0, 15.2, 3.4, "berlin", 0.9);
  flagOf(pen, E + 0.9, 23.8, 15.2, 3.4, "de", 0.9);
  // a man with an accordion, and the ring that has formed round him
  const bx = 37.8;
  const by = 25.8;
  person(pen, bx, by, 0, { ...randomLook(rng), hat: C.charcoal, top: C.cream }, "stand", false);
  pen.obj(() => {
    const cd = pen.card(bx, by, 0.95);
    cd.rect(-0.5, 0, 0.5, 0.5, C.redDark, { outline: true, w: W_FINE, layer: 6 });
    for (const a of [-0.3, -0.1, 0.1, 0.3]) cd.seg(a, 0.04, a, 0.46, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 7 });
    pen.box(bx + 0.6, by + 0.9, 0, 0.5, 0.36, 0.1, C.black, { w: W_FINE });
  });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 1.7 + 0.5;
    person(pen, bx + Math.cos(a) * 2.5, by + Math.sin(a) * 2.2, 0, randomLook(rng), k % 3 ? "stand" : "wave", Math.cos(a) > 0, k === 3 ? 0.72 : 1);
  }
  // the portrait artist: easels with yesterday's faces, a sitter trying not to move
  const px = 36.4;
  const py = 37.4;
  pen.obj(() => {
    for (const [dx, dy, col] of [
      [-1.5, -0.5, C.cream],
      [-0.9, -1.2, C.white],
      [1.6, -0.4, C.cream],
    ] as [number, number, RGB][]) {
      const cd = pen.card(px + dx, py + dy, 0);
      cd.bar(-0.3, 0, 0, 1.2, 0.06, C.woodDark);
      cd.bar(0.3, 0, 0, 1.2, 0.06, C.woodDark);
      cd.rect(-0.4, 0.7, 0.4, 1.75, col, { outline: true, w: W_FINE, layer: 1 });
      cd.circle(0, 1.3, 0.2, null, { ink: C.inkSoft, w: 0.05, seg: 8, layer: 2 });
      cd.seg(-0.18, 0.95, 0.18, 0.95, { w: 0.05, color: C.inkSoft, kind: L_MARK, wobble: 0.5, layer: 2 });
    }
    pen.box(px + 0.9, py - 0.2, 0, 0.4, 0.4, 0.42, C.wood, { w: W_FINE });
    pen.box(px - 0.2, py - 0.1, 0, 0.4, 0.4, 0.42, C.wood, { w: W_FINE });
  });
  person(pen, px + 1.1, py, 0.28, randomLook(rng), "bust", true);
  person(pen, px, py + 0.1, 0.28, { ...randomLook(rng), hat: C.black, top: C.blueDark }, "bust", false);
  person(pen, px + 2.2, py + 0.9, 0, randomLook(rng), "stand", true);
  person(pen, px + 1.6, py + 1.5, 0, randomLook(rng), "stand", true, 0.72);
  // people about the churches, on the plinth, reading the plaque, looking up at the broken edge
  for (const [x, y, pose, fl, s] of [
    [24.4, 15.2, "stand", false, 1],
    [27.0, 14.9, "wave", true, 1],
    [28.6, 15.6, "stand", true, 0.72],
    [30.6, 12.6, "stand", false, 1],
    [22.6, 14.6, "stand", true, 1],
    [26.6, 20.4, "stand", false, 1],
    [27.6, 22.8, "stand", true, 1],
  ] as [number, number, "stand" | "wave", boolean, number][]) {
    person(pen, x, y, y < 25.6 && x < 30 ? PL : 0, randomLook(rng), pose, fl, s);
  }
  // window shoppers along the store, and one with far too many bags
  person(pen, 14.4, 16.2, 0, randomLook(rng), "stand", false);
  person(pen, 13.9, 22.6, 0, randomLook(rng), "stand", true);
  const shopper = { ...randomLook(rng), top: C.cream };
  person(pen, 14.6, 20.9, 0, shopper, "walkA", false);
  pen.obj(() => {
    for (const [dx, col] of [
      [-0.55, C.gold],
      [0.55, C.pink],
      [0.75, C.teal],
    ] as [number, RGB][]) {
      pen.card(14.6 + dx, 20.9, 0.25).rect(-0.18, 0, 0.18, 0.5, col, { outline: true, w: W_FINE, layer: 6 });
    }
  });
  dog(pen, 31.6, 38.6, 0, C.cream, false, 0.85);
  person(pen, 32.5, 38.4, 0, randomLook(rng), "stand", true);
  // a balloon that got away from somebody in the queue for the Zoo
  pen.obj(() => {
    const cd = pen.card(37.2, 14.2, 0);
    cd.line(
      [
        [0, 4.4],
        [0.1, 5.2],
        [-0.05, 6.0],
      ],
      { w: 0.04, wobble: 0.4, sway: 0.2, swayB: 0.6 },
    );
    cd.ellipse(-0.05, 6.5, 0.42, 0.52, C.red, { outline: true, w: W_FINE, seg: 10, sway: 0.6, layer: 1 });
  });
  person(pen, 37.2, 14.4, 0, randomLook(rng), "cheer", false, 0.72);

  // ---- the premiere. Ropes down both sides of the carpet, the press on one side, the fans on the other
  const x0 = 13.4;
  const x1 = 21.6;
  pen.obj(() => {
    for (const y of [CARPET_Y - 1.15, CARPET_Y + 1.15]) {
      const rope: V3[] = [];
      for (let x = x0; x <= x1 + 1e-6; x += 1.64) {
        pen.pole([x, y, 0], [x, y, 0.95], 0.1, C.gold);
        rope.push([x, y, 0.88]);
        if (x + 1.64 <= x1 + 1e-6) rope.push([x + 0.82, y, 0.66]);
      }
      pen.stroke(rope, { w: 0.08, color: C.redDark, kind: L_BAR, wobble: 0 });
    }
  });
  // the Golden Bear, up on the corner of the marquee
  buddyBear(pen, 13.6, CARPET_Y - 3.2, C.gold, 3.1);
  const press: V2[] = [];
  for (let k = 0; k < 7; k++) press.push([14.2 + k * 1.08, CARPET_Y - 1.75 - (k % 2) * 0.35]);
  for (const [x, y] of press) {
    const lk: Look = { ...randomLook(rng), top: rng.pick([C.black, C.charcoal, C.slate]), hat: null };
    person(pen, x, y, 0, lk, "stand", false);
    pen.obj(() => {
      const cd = pen.card(x + 0.12, y + 0.05, 1.2);
      cd.rect(-0.2, 0, 0.2, 0.27, C.black, { layer: 6 });
      cd.circle(0.02, 0.13, 0.09, C.slateLight, { layer: 7, seg: 6, grain: 0 });
    });
  }
  for (let k = 0; k < 7; k++) {
    person(pen, 14.0 + k * 1.1, CARPET_Y + 1.75 + (k % 2) * 0.3, 0, randomLook(rng), k % 3 === 1 ? "cheer" : "wave", true, k === 4 ? 0.72 : 1);
  }
  // her escort, in black, a step behind
  person(pen, 18.2, CARPET_Y + 0.12, 0, { skin: [238, 187, 150], hair: [43, 32, 25], top: C.black, legs: C.black, long: false, hat: null }, "stand", true);
  // the star herself, in a long red dress, waving first to one side, then to the other
  const diva: Look = { skin: [246, 211, 184], hair: [227, 194, 124], top: C.gold, legs: C.gold, long: true, hat: null };
  const gown = (p: Pen, pose: "wave" | "cheer") => {
    person(p, 0, 0, 0, diva, pose, false);
    p.card(0, 0, 0).poly(
      [
        [-0.36, 0.8],
        [0.36, 0.8],
        [0.66, 0.02],
        [-0.66, 0.02],
      ],
      C.gold,
      { outline: true, w: W_FINE, layer: 1 },
    );
  };
  const frames = [makeSprite((p) => gown(p, "wave"), 0, 41), makeSprite((p) => gown(p, "cheer"), 0, 41)];
  const sx = c.ox + 17.0;
  const sy = c.oy + CARPET_Y;
  c.movers.push((m) => {
    m.put(frames[Math.floor(m.t * 1.6) & 1], sx, sy, c.oz, c.done);
  });
  // the flashes: every camera along the rope, at its own moments, for as long as the camera of the film is here
  const flashAt = press.map(([x, y]) => [c.ox + x + 0.12, c.oy + y + 0.05, c.oz + 1.38] as V3);
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(sx, sy, c.oz + 2, 14)) return;
    const s = c.stay();
    // with a tour they save it for the arrival; without one there is always somebody trying a shot
    const keen = s ? (m.t > s.at - 0.4 && m.t < s.leave + 0.6 ? 0.42 : 0.05) : 0.18;
    const slot = 0.22;
    const k = Math.floor(m.t / slot);
    const u = m.t / slot - k;
    flashAt.forEach(([x, y, z], i) => {
      if (hash1(k * 7.31 + i * 13.7) > keen) return;
      const e = Math.sin(Math.PI * u);
      const r = 0.5 + 0.75 * e;
      const cd = m.pen.card(x, y, z);
      for (const [dx, dy, f] of [
        [1, 0, 1],
        [0, 1, 1],
        [0.7, 0.7, 0.5],
        [0.7, -0.7, 0.5],
      ]) {
        cd.seg(-dx * r * f, -dy * r * f, dx * r * f, dy * r * f, { w: 0.07 + 0.16 * e * f, color: C.white, alpha: 0.4 + 0.6 * e, kind: L_MARK, wobble: 0, layer: 9 });
      }
      cd.seg(-0.02, 0, 0.02, 0, { w: 1.5 * e, kind: L_LIGHT, wobble: 0, alpha: 0.6, layer: 9 });
    });
  });

  // ---- what else moves
  // the emblem on the Europa-Center: a star in a ring, turning slowly, lit at night
  const ex = c.ox + E + 0.2 + 4;
  const ey = c.oy + E + 0.2 + 4;
  const ez = c.oz + 19 + 5.2;
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(ex, ey, ez, 8)) return;
    const a = m.t * 0.55;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const R = 2.2;
    const at = (t: number, r = R): V3 => [ex + ux * Math.cos(t) * r, ey + uy * Math.cos(t) * r, ez + Math.sin(t) * r];
    const ringPts: V3[] = [];
    for (let k = 0; k <= 20; k++) ringPts.push(at((k / 20) * Math.PI * 2));
    m.pen.stroke(ringPts, { w: 0.3, color: C.ink, kind: L_BAR, wobble: 0 });
    m.pen.stroke(ringPts, { w: 0.19, color: C.glassPale, kind: L_BAR, wobble: 0, bias: 0.012 });
    // four points, like a compass
    for (let k = 0; k < 4; k++) {
      const t = Math.PI / 2 + (k * Math.PI) / 2;
      const spoke = [at(t), at(t + Math.PI / 4, R * 0.26), at(t + Math.PI / 2)];
      m.pen.stroke(spoke, { w: 0.24, color: C.ink, kind: L_BAR, wobble: 0 });
      m.pen.stroke(spoke, { w: 0.14, color: C.glassPale, kind: L_BAR, wobble: 0, bias: 0.012 });
    }
    m.pen.stroke(ringPts, { w: 0.5, kind: L_LIGHT, wobble: 0, alpha: 0.7 });
  });
  // the giraffe behind the Zoo's wall, nodding at the queue
  const gx = c.ox + 42.3;
  const gy = c.oy + 5.1;
  const hide: RGB = [232, 190, 96];
  const patch: RGB = [150, 96, 52];
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(gx, gy, c.oz + 5, 8)) return;
    const nod = Math.sin(m.t * 0.9) * 0.16 + 0.1;
    const cd = m.pen.card(gx, gy, c.oz);
    const nx = 0.25 + Math.sin(nod) * 4.3;
    const ny = 1.4 + Math.cos(nod) * 4.3;
    cd.bar(0.25, 1.4, nx, ny, 0.56, hide, { layer: 1 });
    for (let k = 1; k < 6; k++) cd.circle(0.25 + ((nx - 0.25) * k) / 6 + (k % 2 ? 0.1 : -0.1), 1.4 + ((ny - 1.4) * k) / 6, 0.13, patch, { seg: 5, layer: 2, grain: 0 });
    // head, ears, the two little horns
    cd.poly(
      [
        [nx - 0.3, ny - 0.1],
        [nx + 0.25, ny + 0.3],
        [nx + 1.0, ny - 0.15],
        [nx + 0.9, ny - 0.5],
        [nx + 0.1, ny - 0.5],
      ],
      hide,
      { outline: true, w: W_FINE, layer: 3 },
    );
    cd.seg(nx + 0.05, ny + 0.22, nx - 0.02, ny + 0.62, { w: 0.07, color: patch, kind: L_MARK, wobble: 0, layer: 3 });
    cd.seg(nx + 0.28, ny + 0.26, nx + 0.3, ny + 0.66, { w: 0.07, color: patch, kind: L_MARK, wobble: 0, layer: 3 });
    cd.seg(nx + 0.5, ny - 0.05, nx + 0.5, ny + 0.05, { w: 0.08, wobble: 0, layer: 4 });
  });
  // people going round the square, two on skateboards round the fountain, pigeons round the broken tower
  const round = stroll(c, [
    [16.6, 34.2],
    [16.6, 42.4],
    [42.2, 42.4],
    [42.2, 18.6],
    [34.8, 18.6],
    [34.8, 23.2],
    [25.2, 26.2],
    [21.8, 34.2],
  ]);
  for (let k = 0; k < 8; k++) c.movers.push(walker(round, rng, c.done + rng.range(0, 1)));
  const rink: V3[] = [];
  for (let k = 0; k < 28; k++) {
    const a = -(k / 28) * Math.PI * 2;
    rink.push([c.ox + 29.5 + Math.cos(a) * 6.0, c.oy + 32.5 + Math.sin(a) * 5.4, c.oz]);
  }
  const rinkRoute = new Route(rink, true);
  for (let k = 0; k < 2; k++) {
    const lk: Look = { ...randomLook(rng), hat: k ? C.red : null };
    const sp = [0, 1].map((fl) => [0, 1].map((fr) => makeSprite((p) => skater(p, lk, fr, fl === 1), 0, 51 + k)));
    c.movers.push(traveler(rinkRoute, { speed: 3.3 + k * 0.5, at: k * 0.47, born: c.done + 0.4 * k, span: 1, sprite: (h, t) => sp[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 1.4 + k) & 1] }));
  }
  const birds = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 5; k++) {
    const r = 3.4 + k * 1.1;
    const sp = (0.55 + 0.08 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 6 + ph) & 1;
      m.put(birds[flap][vx - vy < 0 ? 1 : 0], c.ox + TX + Math.cos(a) * r, c.oy + TY + Math.sin(a) * r * 0.8, c.oz + 24.5 + Math.sin(m.t * 0.7 + ph) * 1.1, born);
    });
  }
};
