// The Berlin kit: what this city is made of that the general kit does not
// have. The five-storey tenement with its shop downstairs and a fire wall at
// the end of the row, the prefabricated slab, the snack stand, the late shop,
// the advertising column, the little green man, the bear. Each prop draws
// itself at the pen's origin in its own local space, like everything in kit.ts.

import { RGB, Rng, V2, V3, mixRGB, scaleRGB } from "../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../engine/pen";
import { W_FINE, W_THIN, Look, person, randomLook, windowAt } from "./kit";
import { AWNING, C, DOOR, FLAG_BERLIN, FLAG_DE, GRAFFITI, HOUSE, ROOF, TULIP } from "./palette";

// ---------------------------------------------------------------- tenements

/** What trades on a tenement's ground floor. */
export type Shop = "cafe" | "spaeti" | "doner" | "bakery" | "bar" | "flowers" | "books" | "bikes" | "records" | "none";

const SHOPS: Record<Exclude<Shop, "none">, { sign: string; board: RGB; ink: RGB; awning: boolean }> = {
  cafe: { sign: "CAFÉ", board: C.cream, ink: C.ink, awning: true },
  spaeti: { sign: "SPÄTI", board: C.yellow, ink: C.ink, awning: false },
  doner: { sign: "DÖNER", board: C.red, ink: C.white, awning: false },
  bakery: { sign: "BÄCKEREI", board: C.ochre, ink: C.ink, awning: true },
  bar: { sign: "KNEIPE", board: C.charcoal, ink: C.yellow, awning: false },
  flowers: { sign: "BLUMEN", board: C.green, ink: C.white, awning: true },
  books: { sign: "BÜCHER", board: C.blueDark, ink: C.white, awning: false },
  bikes: { sign: "FAHRRAD", board: C.orange, ink: C.ink, awning: false },
  records: { sign: "PLATTEN", board: C.black, ink: C.pink, awning: false },
};

export interface AltbauSpec {
  /** Width along the street, 6 to 10. */
  w: number;
  /** Depth back from the street. Default 8. */
  d?: number;
  /** Storeys above the ground floor. Default 4: Berlin built to one eaves height, and whole streets keep it. */
  floors?: number;
  color?: RGB;
  roof?: RGB;
  door?: RGB;
  shop?: Shop;
  /** Words for the board over the shop, instead of the trade's own. */
  sign?: string;
  /** Iron balconies up the middle of the front. Default: most houses. */
  balconies?: boolean;
  /** How much spray paint the ground floor has collected, 0 to 1. */
  graffiti?: number;
  /** Chance that a window is lit at night. */
  lit?: number;
  /**
   * The end wall, where this house is the last of its row (the wall on local
   * +x, or on -x if that is the one the camera sees): "fire" is the bare
   * windowless fire wall, "ivy" the same grown over, "windows" a proper side
   * front. Or a function that paints a mural on it: a is across (0 to d), b up
   * (0 to the eaves).
   */
  end?: "fire" | "ivy" | "windows" | ((f: Plane, d: number, h: number) => void) | null;
}

const GROUND = 3.0;
const STOREY = 2.3;
const CORNICE = 0.45;

/** Height of a tenement's eaves for a number of upper storeys. */
export function altbauHeight(floors = 4): number {
  return GROUND + floors * STOREY + CORNICE;
}

/**
 * A Berlin tenement: stucco front on the +y side, a tall ground floor with a
 * shop and a carriage door, four storeys of windows with balconies, a cornice
 * and a tiled roof with its ridge along the street. Its footprint runs from
 * the origin to (w, d).
 */
export function altbau(pen: Pen, rng: Rng, s: AltbauSpec): void {
  const w = s.w;
  const d = s.d ?? 8;
  const floors = s.floors ?? 4;
  const h = altbauHeight(floors);
  const col = s.color ?? rng.pick(HOUSE);
  const trim = mixRGB(col, C.white, 0.55);
  const dark = scaleRGB(col, 0.86);
  const roof = s.roof ?? rng.pick(ROOF);
  const lit = s.lit ?? 0.55;
  const shop = s.shop ?? "none";
  pen.begin();
  pen.box(0, 0, 0, w, d, h, col);
  const f = pen.wall("y+", 0, 0, 0, w, d);
  // the ground floor: a plinth, banded render, the cornice that divides it from the flats
  f.rect(0, 0, w, GROUND - 0.2, dark, { grain: 0.7 });
  f.rect(0, 0, w, 0.4, scaleRGB(col, 0.72), { grain: 0.7, layer: 1 });
  for (const b of [1.1, 1.75, 2.4]) f.seg(0.05, b, w - 0.05, b, { w: 0.045, color: scaleRGB(col, 0.72), kind: L_MARK, wobble: 0.2, layer: 1 });
  f.rect(0, GROUND - 0.2, w, GROUND + 0.08, trim, { grain: 0.4, layer: 1 });
  f.seg(0, GROUND - 0.2, w, GROUND - 0.2, { w: 0.05, layer: 2 });
  f.rect(0, h - CORNICE, w, h, trim, { grain: 0.4, layer: 1 });
  f.seg(0, h - CORNICE, w, h - CORNICE, { w: 0.06, layer: 2 });

  // windows, evenly across; the first floor's get a lintel, the top floor's are shorter
  const cols = Math.max(2, Math.round((w - 0.7) / 1.62));
  const pitch = (w - 0.7) / cols;
  const ww = 0.9;
  const colA = (k: number) => 0.35 + (k + 0.5) * pitch;
  const balcony = s.balconies ?? rng.chance(0.75);
  const mid = cols >> 1;
  const balCols = !balcony ? [] : cols >= 5 ? [mid - 1, mid + (cols % 2 ? 1 : 0)] : cols % 2 ? [mid] : [mid - 1, mid];
  for (let i = 0; i < floors; i++) {
    const b0 = GROUND + 0.42 + i * STOREY;
    const b1 = b0 + (i === floors - 1 ? 1.3 : 1.5);
    for (let k = 0; k < cols; k++) {
      const a = colA(k);
      windowAt(f, a - ww / 2, b0, a + ww / 2, b1, rng.chance(lit), trim, i < floors - 1);
      if (i === 0) f.seg(a - ww / 2 - 0.12, b1 + 0.2, a + ww / 2 + 0.12, b1 + 0.2, { w: 0.09, color: trim, kind: L_MARK, wobble: 0, layer: 1 });
    }
    if (i < floors - 1) {
      for (const k of balCols) {
        if (k < 0 || k >= cols) continue;
        const a = colA(k);
        // a slab, an iron rail, and whatever is growing in the boxes
        f.block(a - 0.75, b0 - 0.16, a + 0.75, b0 - 0.02, 0.62, C.stoneDark, { w: W_FINE });
        const rail = pen.wall("y+", 0, 0, 0, w, d + 0.62);
        rail.rect(a - 0.75, b0 - 0.02, a + 0.75, b0 + 0.68, C.charcoal, { layer: 0, grain: 0.3, outline: true, w: W_FINE });
        for (let q = -0.5; q <= 0.51; q += 0.25) rail.seg(a + q, b0, a + q, b0 + 0.66, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 1 });
        if (rng.chance(0.6)) rail.ticks(a - 0.7, b0 + 0.6, a + 0.7, b0 + 0.95, { n: 7, len: 0.22, ang: 1.57, jit: 0.5, color: rng.pick([C.red, C.pink, C.leaf, C.yellow, C.leaf2]), w: 0.13, layer: 2 });
      }
    }
  }

  // the ground floor: the carriage door that leads to the courtyards behind, and a shop
  const doorLeft = rng.chance(0.5);
  const dw = 1.5;
  const da = doorLeft ? 0.5 : w - 0.5 - dw;
  const door = s.door ?? rng.pick(DOOR);
  const arch: V2[] = [
    [da, 0],
    [da + dw, 0],
    [da + dw, 1.75],
  ];
  for (let k = 1; k < 6; k++) arch.push([da + dw / 2 + (Math.cos((k / 6) * Math.PI) * dw) / 2, 1.75 + Math.sin((k / 6) * Math.PI) * 0.7]);
  arch.push([da, 1.75]);
  f.poly(arch, door, { outline: true, w: W_THIN, layer: 2 });
  f.seg(da + dw / 2, 0, da + dw / 2, 2.4, { w: 0.05, wobble: 0, layer: 3 });
  const s0 = doorLeft ? da + dw + 0.5 : 0.5;
  const s1 = doorLeft ? w - 0.5 : da - 0.5;
  if (shop !== "none" && s1 - s0 > 2) {
    const kind = SHOPS[shop];
    f.rect(s0, 0.45, s1, 2.25, C.glassLight, { outline: true, w: W_THIN, glow: 0.85, layer: 2 });
    f.seg((s0 + s1) / 2, 0.45, (s0 + s1) / 2, 2.25, { w: 0.05, wobble: 0, layer: 3 });
    const text = s.sign ?? kind.sign;
    const size = Math.min(0.42, ((s1 - s0 - 0.5) / text.length / 5.5) * 6);
    if (kind.awning) {
      const aw = pen.plane([s0 - 0.1, d, 2.78], [1, 0, 0], [0, 1.0, -0.5], 0, true);
      const n = Math.max(4, Math.round((s1 - s0) / 0.6));
      const len = s1 - s0 + 0.2;
      const stripe = rng.pick(AWNING);
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
      f.text(text, (s0 + s1) / 2, 2.42, size * 0.8, { align: "c", layer: 3, w: 0.06 });
    } else {
      f.rect(s0, 2.3, s1, 2.82, kind.board, { outline: true, w: W_FINE, layer: 2, glow: shop === "spaeti" || shop === "doner" ? 0.5 : 0 });
      f.text(text, (s0 + s1) / 2, 2.56 - size / 2, size, { align: "c", layer: 3, color: kind.ink, kind: L_MARK, w: 0.07 });
    }
    shopFront(pen, rng, shop, s0, s1, d);
  } else if (s1 - s0 > 1.6) {
    const n = Math.max(1, Math.round((s1 - s0) / 1.7));
    for (let k = 0; k < n; k++) {
      const a = s0 + ((k + 0.5) * (s1 - s0)) / n;
      windowAt(f, a - 0.5, 0.95, a + 0.5, 2.3, rng.chance(lit), trim);
    }
  }
  // what the years have added
  const g = s.graffiti ?? 0;
  if (g > 0) tags(f, rng, 0.2, w - 0.2, 0.45, 1.9, Math.round(g * (2 + w * 0.5)));
  pen.end();

  // the roof arrives after the walls: tiles, a ridge along the street, dormers and chimneys
  pen.obj(() => {
    pen.gable(-0.12, -0.05, h, w + 0.24, d + 0.3, 1.9, "x", roof, { gable: col });
    const nd = Math.max(1, Math.round(w / 4));
    for (let k = 0; k < nd; k++) {
      const a = ((k + 0.5) * w) / nd;
      pen.box(a - 0.5, d * 0.62, h + 0.35, 1.0, d * 0.3, 0.95, col, { top: roof, w: W_THIN });
      windowAt(pen.wall("y+", a - 0.5, d * 0.62, h + 0.35, 1.0, d * 0.3), 0.2, 0.15, 0.8, 0.8, rng.chance(lit * 0.5), trim, false);
    }
    for (let k = 0; k < 2; k++) {
      const a = rng.range(0.8, w - 1.4);
      pen.box(a, d * 0.5 - 0.25, h + 1.5, 0.6, 0.5, 1.0, C.brickDark, { top: C.charcoal, w: W_THIN });
    }
  }, 0.14);

  // the end of the row
  if (s.end) {
    for (const sd of ["x+", "x-"] as const) {
      const e = pen.wall(sd, 0, 0, 0, w, d);
      if (!e.visible) continue;
      pen.obj(() => {
        if (s.end === "windows") {
          for (let i = 0; i < floors; i++) {
            const b0 = GROUND + 0.42 + i * STOREY;
            for (let k = 0; k < 2; k++) {
              const a = d * (0.28 + k * 0.44);
              windowAt(e, a - 0.42, b0, a + 0.42, b0 + 1.4, rng.chance(lit), trim);
            }
          }
          return;
        }
        // a fire wall: bare render with the ghost of the house that once leaned on it
        e.rect(0, 0, d, h, mixRGB(col, C.stoneDark, 0.5), { grain: 0.9 });
        e.ticks(0.3, 0.4, d - 0.3, h - 0.4, { n: Math.round(d * h * 0.16), len: 0.9, ang: 0, jit: 0.05, color: mixRGB(col, C.greyDark, 0.45), w: 0.05 });
        if (typeof s.end === "function") s.end(e, d, h);
        else if (s.end === "ivy") {
          for (let k = 0; k < 3; k++) e.ticks(0.2, 0, d * rng.range(0.5, 1), h * rng.range(0.45, 0.95), { n: Math.round(d * h * 0.7), len: 0.42, ang: 0.9, jit: 1.2, color: rng.pick([C.leafDark, C.hedge, C.leaf2]), w: 0.16, layer: 1 });
        }
      }, 0.1);
    }
  }
}

/** A few sprayed tags on a wall plane. */
export function tags(f: Plane, rng: Rng, a0: number, a1: number, b0: number, b1: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = rng.range(a0, a1 - 1);
    const b = rng.range(b0, b1 - 0.5);
    const len = rng.range(0.7, 1.6);
    const pts: V2[] = [];
    const m = 6;
    for (let k = 0; k <= m; k++) pts.push([a + (k / m) * len, b + rng.range(0, 0.55) * (k % 2 ? 1 : 0.2)]);
    f.line(pts, { w: rng.range(0.09, 0.15), color: rng.pick(GRAFFITI), kind: L_MARK, wobble: 0.6, layer: 3 });
  }
}

/** What stands on the pavement outside a shop (in the house's local frame, d is its front). */
function shopFront(pen: Pen, rng: Rng, shop: Shop, a0: number, a1: number, d: number): void {
  const mid = (a0 + a1) / 2;
  if (shop === "cafe" || shop === "bakery") {
    // little tables out on the pavement, as soon as the sun is out
    for (const a of a1 - a0 > 4.5 ? [mid - 1.3, mid + 1.3] : [mid]) {
      pen.cyl(a, d + 1.25, 0.6, 0.38, 0.07, C.white, { seg: 8 });
      pen.pole([a, d + 1.25, 0], [a, d + 1.25, 0.6], 0.08, C.greyDark, { ink: false });
      for (const o of [-0.7, 0.7]) {
        pen.box(a + o - 0.17, d + 1.08, 0, 0.34, 0.34, 0.4, C.wood, { w: W_FINE });
        if (rng.chance(0.7)) person(pen, a + o, d + 1.25, 0.28, randomLook(rng), "bust", o > 0);
      }
    }
  } else if (shop === "spaeti") {
    // crates of bottles, and a bench where the evening is spent
    for (let k = 0; k < 3; k++) pen.box(a0 + 0.1 + k * 0.62, d + 0.15, 0, 0.55, 0.42, 0.34 + (k % 2) * 0.34, [C.yellow, C.green, C.red][k], { w: W_FINE });
    pen.box(mid - 0.2, d + 1.0, 0.36, 1.7, 0.42, 0.1, C.wood, { w: W_FINE });
    person(pen, mid + 0.2, d + 1.2, 0.2, randomLook(rng), "sit", false);
    if (rng.chance(0.8)) person(pen, mid + 1.0, d + 1.2, 0.2, randomLook(rng), "sit", true);
  } else if (shop === "doner") {
    // the spit in the window, and the queue for it
    const fw = pen.wall("y+", 0, 0, 0, a1, d + 0.02, 3);
    fw.poly(
      [
        [a0 + 0.55, 0.8],
        [a0 + 1.05, 0.8],
        [a0 + 1.2, 2.0],
        [a0 + 0.4, 2.0],
      ],
      C.brickBrown,
      { outline: true, w: W_FINE },
    );
    for (let k = 0; k < 3; k++) person(pen, mid - 0.6 + k * 0.75, d + 0.9 + (k % 2) * 0.25, 0, randomLook(rng), k === 0 ? "wave" : "stand", k % 2 === 0);
  } else if (shop === "flowers") {
    for (let k = 0; k < 5; k++) {
      const a = a0 + 0.3 + (k * (a1 - a0 - 0.6)) / 4;
      pen.cyl(a, d + 0.5, 0, 0.24, 0.42, C.zinc, { seg: 7 });
      const c = pen.card(a, d + 0.5, 0.42);
      for (let q = 0; q < 4; q++) c.circle(rng.range(-0.22, 0.22), rng.range(0.1, 0.5), 0.14, rng.pick(TULIP), { seg: 6, grain: 0, layer: 1 });
    }
  } else if (shop === "books" || shop === "records") {
    pen.box(mid - 0.9, d + 0.45, 0, 1.8, 0.6, 0.7, C.wood, { w: W_FINE });
    for (let k = 0; k < 5; k++) pen.box(mid - 0.82 + k * 0.34, d + 0.5, 0.7, 0.28, 0.5, rng.range(0.12, 0.3), rng.pick([C.red, C.blue, C.yellow, C.teal, C.cream, C.purple]), { w: W_FINE, edges: false });
    if (rng.chance(0.8)) person(pen, mid + 1.4, d + 0.8, 0, randomLook(rng), "stand", true);
  } else if (shop === "bar") {
    // a lamp over the door and somebody outside with a glass
    fwLight(pen, mid, d + 0.05, 2.5);
    person(pen, mid - 0.5, d + 0.7, 0, randomLook(rng), "stand", false);
    if (rng.chance(0.6)) person(pen, mid + 0.4, d + 0.8, 0, randomLook(rng), "wave", true);
  }
}

function fwLight(pen: Pen, x: number, y: number, z: number): void {
  pen.stroke(
    [
      [x - 0.02, y, z],
      [x + 0.02, y, z],
    ],
    { w: 1.1, kind: L_LIGHT, wobble: 0, alpha: 0.5 },
  );
}

export interface RowOpts {
  /** Widths to cycle through. Default 6.5 to 9. */
  widths?: number[];
  d?: number;
  floors?: number;
  /** Trades to hand out along the row, in order ("none" for a house with no shop). Default: a mix. */
  shops?: Shop[];
  graffiti?: number;
  lit?: number;
  /** What the two ends of the row show. Default "fire". */
  end?: AltbauSpec["end"];
  colors?: RGB[];
}

/**
 * A row of tenements along local +x from the origin, fronts on the +y side,
 * all to the same eaves. Returns the total width used.
 */
export function altbauRow(pen: Pen, rng: Rng, n: number, o: RowOpts = {}): number {
  const widths = o.widths ?? [7.2, 8.4, 6.6, 9, 7.8];
  const shops = o.shops ?? ["cafe", "none", "spaeti", "bakery", "none", "doner", "books", "bar", "flowers"];
  let x = 0;
  let last: RGB | null = null;
  for (let i = 0; i < n; i++) {
    const w = widths[i % widths.length];
    let color = o.colors ? o.colors[i % o.colors.length] : rng.pick(HOUSE);
    // no two neighbours the same colour
    for (let k = 0; k < 4 && !o.colors && color === last; k++) color = rng.pick(HOUSE);
    last = color;
    pen.push(x, 0, 0);
    altbau(pen, rng, {
      w,
      d: o.d,
      floors: o.floors,
      color,
      shop: shops[i % shops.length],
      graffiti: o.graffiti,
      lit: o.lit,
      end: i === 0 || i === n - 1 ? (o.end === undefined ? "fire" : o.end) : null,
    });
    pen.pop();
    x += w;
  }
  return x;
}

// ---------------------------------------------------------------- prefabricated slabs

export interface PlatteSpec {
  w: number;
  d?: number;
  floors?: number;
  color?: RGB;
  /** The colour of the balcony panels. */
  accent?: RGB;
  lit?: number;
}

/**
 * A Plattenbau: a slab of flats put together from concrete panels, a loggia
 * to every flat with a coloured front. Footprint from the origin to (w, d),
 * the long front on +y.
 */
export function plattenbau(pen: Pen, rng: Rng, s: PlatteSpec): void {
  const w = s.w;
  const d = s.d ?? 7;
  const floors = s.floors ?? 8;
  const fh = 2.15;
  const h = 0.5 + floors * fh + 0.5;
  const col = s.color ?? C.concrete;
  const accent = s.accent ?? rng.pick([C.orange, C.yellow, C.sky, C.grassLight, C.brickRose]);
  const lit = s.lit ?? 0.5;
  pen.begin();
  pen.box(0, 0, 0, w, d, h, col, { top: C.concreteDark });
  const f = pen.wall("y+", 0, 0, 0, w, d);
  const bays = Math.max(2, Math.round(w / 2.3));
  const bw = w / bays;
  // the seams between the panels
  for (let k = 1; k < bays; k++) f.seg(k * bw, 0.1, k * bw, h - 0.1, { w: 0.045, color: C.concreteDark, kind: L_MARK, wobble: 0 });
  for (let i = 0; i <= floors; i++) f.seg(0.05, 0.5 + i * fh, w - 0.05, 0.5 + i * fh, { w: 0.045, color: C.concreteDark, kind: L_MARK, wobble: 0 });
  for (let i = 0; i < floors; i++) {
    const b0 = 0.5 + i * fh;
    for (let k = 0; k < bays; k++) {
      const a0 = k * bw;
      if (k % 3 === 1) {
        // a loggia: a dark recess over a coloured parapet
        f.rect(a0 + 0.14, b0 + 0.12, a0 + bw - 0.14, b0 + fh - 0.2, scaleRGB(col, 0.6), { layer: 1, grain: 0.6, glow: rng.chance(lit) ? 0.7 : 0 });
        f.rect(a0 + 0.14, b0 + 0.12, a0 + bw - 0.14, b0 + 0.95, accent, { layer: 2, grain: 0.5, outline: true, w: W_FINE });
      } else if (i === 0 && k % 3 === 0 && k % 6 === 0) {
        f.rect(a0 + bw / 2 - 0.5, 0, a0 + bw / 2 + 0.5, 1.95, C.doorBlue, { layer: 1, outline: true, w: W_FINE });
        f.block(a0 + bw / 2 - 0.9, 2.05, a0 + bw / 2 + 0.9, 2.2, 0.9, C.concreteDark, { w: W_FINE });
      } else {
        f.rect(a0 + 0.3, b0 + 0.72, a0 + bw - 0.3, b0 + fh - 0.3, C.glass, { layer: 1, grain: 0.5, glow: rng.chance(lit) ? 1 : 0, outline: true, w: W_FINE, ink: C.white });
      }
    }
  }
  // the blank end wall, in its panels
  for (const sd of ["x+", "x-"] as const) {
    const e = pen.wall(sd, 0, 0, 0, w, d);
    if (!e.visible) continue;
    for (let i = 0; i <= floors; i++) e.seg(0.05, 0.5 + i * fh, d - 0.05, 0.5 + i * fh, { w: 0.045, color: C.concreteDark, kind: L_MARK, wobble: 0 });
    e.seg(d / 2, 0.1, d / 2, h - 0.1, { w: 0.045, color: C.concreteDark, kind: L_MARK, wobble: 0 });
  }
  // lift gear and aerials on the roof
  pen.box(w * 0.3, d * 0.3, h, 2.2, 2.2, 1.1, col, { top: C.concreteDark, w: W_THIN });
  pen.pole([w * 0.7, d * 0.5, h], [w * 0.7, d * 0.5, h + 2.2], 0.06, C.greyDark, { ink: false });
  pen.end();
}

// ---------------------------------------------------------------- street furniture

/** A Litfaßsäule: the fat round advertising column, invented here in 1855. */
export function litfass(pen: Pen, rng: Rng, x: number, y: number, z = 0): void {
  const r = 0.62;
  pen.begin();
  pen.cyl(x, y, z, r, 2.7, C.cream, { seg: 12 });
  pen.cyl(x, y, z + 2.7, r + 0.1, 0.16, C.green, { seg: 12 });
  pen.dome(x, y, z + 2.86, r * 0.9, 0.45, C.green, { seg: 12, rings: 3 });
  // posters on the two sides the camera sees
  for (const sd of ["x+", "y+"] as const) {
    const f = pen.wall(sd, x - r - 0.01, y - 0.42, z, r * 2 + 0.02, 0.84);
    for (let k = 0; k < 2; k++) {
      const b0 = 0.45 + k * 1.1;
      const col = rng.pick([C.red, C.yellow, C.blue, C.pink, C.teal, C.orange, C.white, C.purple]);
      f.rect(0.08, b0, 0.76, b0 + 0.95, col, { outline: true, w: W_FINE, grain: 0.5 });
      f.seg(0.2, b0 + 0.6, 0.64, b0 + 0.6, { w: 0.07, color: C.ink, kind: L_MARK, wobble: 0.3, layer: 1 });
      f.seg(0.2, b0 + 0.35, 0.5, b0 + 0.35, { w: 0.05, color: C.ink, kind: L_MARK, wobble: 0.3, layer: 1 });
    }
  }
  pen.end();
}

/**
 * A pedestrian light with the East's little men: the red one stands with his
 * arms out, the green one strides off in his hat. `go` chooses which is lit.
 */
export function ampel(pen: Pen, x: number, y: number, z = 0, go = true): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + 2.3], 0.11, C.greyDark);
  const c = pen.card(x, y, z + 2.3);
  c.rect(-0.3, 0, 0.3, 1.25, C.black, { outline: true, w: W_FINE, layer: 1 });
  const red = go ? scaleRGB(C.ampelRed, 0.45) : C.ampelRed;
  const green = go ? C.ampelGreen : scaleRGB(C.ampelGreen, 0.45);
  // the one who waits
  c.circle(0, 1.05, 0.07, red, { seg: 6, layer: 2, grain: 0, glow: go ? 0 : 0.2 });
  c.rect(-0.05, 0.78, 0.05, 0.98, red, { layer: 2, grain: 0 });
  c.seg(-0.2, 0.93, 0.2, 0.93, { w: 0.06, color: red, kind: L_MARK, wobble: 0, layer: 2 });
  c.seg(-0.04, 0.78, -0.07, 0.68, { w: 0.05, color: red, kind: L_MARK, wobble: 0, layer: 2 });
  c.seg(0.04, 0.78, 0.07, 0.68, { w: 0.05, color: red, kind: L_MARK, wobble: 0, layer: 2 });
  // the one who goes: hat, a long stride, an arm swung forward
  c.circle(0.01, 0.47, 0.065, green, { seg: 6, layer: 2, grain: 0, glow: go ? 0.2 : 0 });
  c.seg(-0.09, 0.52, 0.11, 0.52, { w: 0.045, color: green, kind: L_MARK, wobble: 0, layer: 2 });
  c.rect(-0.045, 0.24, 0.055, 0.4, green, { layer: 2, grain: 0 });
  c.seg(0.0, 0.25, -0.15, 0.1, { w: 0.055, color: green, kind: L_MARK, wobble: 0, layer: 2 });
  c.seg(0.02, 0.25, 0.16, 0.1, { w: 0.055, color: green, kind: L_MARK, wobble: 0, layer: 2 });
  c.seg(0.03, 0.38, 0.19, 0.3, { w: 0.045, color: green, kind: L_MARK, wobble: 0, layer: 2 });
  pen.end();
}

/** The green disc with a white S that marks an S-Bahn station. */
export function sSign(pen: Pen, x: number, y: number, z: number, h = 3.2): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.12, C.greyDark);
  const c = pen.card(x, y, z + h);
  c.circle(0, 0.55, 0.55, C.green, { outline: true, w: W_FINE, layer: 1, seg: 14, glow: 0.25 });
  c.text("S", -0.2, 0.25, 0.6, { color: C.white, kind: L_MARK, w: 0.12, wobble: 0, layer: 2 });
  pen.end();
}

/**
 * A snack stand: a hut with a hatch, its name on the roof, tall tables to
 * eat at standing up, and a queue. Faces local +y; about 3.4 x 2.4.
 */
export function imbiss(pen: Pen, rng: Rng, o: { sign?: string; color?: RGB; board?: RGB; queue?: number } = {}): void {
  const w = 3.4;
  const d = 2.4;
  const col = o.color ?? C.cream;
  const board = o.board ?? C.red;
  const text = o.sign ?? "CURRYWURST";
  pen.begin();
  pen.box(0, 0, 0, w, d, 2.5, col, { top: C.zinc });
  const f = pen.wall("y+", 0, 0, 0, w, d);
  f.rect(0.3, 1.0, w - 0.3, 2.05, C.charcoal, { outline: true, w: W_THIN, glow: 0.6, layer: 1 });
  f.block(0.2, 0.92, w - 0.2, 1.02, 0.4, C.stone, { w: W_FINE });
  f.rect(0, 0, w, 0.5, board, { grain: 0.5 });
  // whoever is frying
  person(pen, w * 0.5, d - 0.25, 0.25, randomLook(rng), "bust", false);
  // the name, on a board along the roof
  const sg = pen.plane([-0.1, d + 0.02, 2.5], [1, 0, 0], [0, 0, 1], 1, true);
  sg.rect(0, 0, w + 0.2, 0.72, board, { outline: true, w: W_FINE, glow: 0.4 });
  sg.text(text, (w + 0.2) / 2, 0.18, Math.min(0.4, (((w - 0.2) / text.length) * 6) / 5.5), { align: "c", layer: 1, color: C.white, kind: L_MARK, w: 0.07 });
  // an awning over the hatch
  const aw = pen.plane([0, d, 2.45], [1, 0, 0], [0, 1.0, -0.42], 0, true);
  aw.rect(0, 0, w, 1.0, C.white, { outline: true, w: W_THIN, grain: 0.6 });
  for (let k = 0; k < 4; k++) aw.rect((k * 2 * w) / 8, 0, ((k * 2 + 1) * w) / 8, 1.0, board, { grain: 0.6, layer: 1 });
  pen.end();
  const q = o.queue ?? 3;
  for (let k = 0; k < q; k++) person(pen, w * 0.5 + 0.2 - k * 0.1, d + 1.3 + k * 0.75, 0, randomLook(rng), k === 0 ? "wave" : "stand", k % 2 === 0, rng.chance(0.12) ? 0.72 : 1);
  for (const [tx, ty] of [
    [w + 1.2, d + 0.6],
    [-1.1, d + 1.0],
  ]) {
    stehtisch(pen, tx, ty);
    person(pen, tx - 0.55, ty + 0.1, 0, randomLook(rng), "stand", false);
    if (rng.chance(0.75)) person(pen, tx + 0.55, ty + 0.15, 0, randomLook(rng), "stand", true);
  }
}

/** A tall table to stand at with a paper plate. */
export function stehtisch(pen: Pen, x: number, y: number, z = 0): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + 1.1], 0.09, C.greyDark, { ink: false });
  pen.cyl(x, y, z + 1.1, 0.4, 0.07, C.white, { seg: 8 });
  pen.end();
}

/** A beer-garden set: a long table between two benches, and people along both. Runs along local +x. */
export function bierbank(pen: Pen, rng: Rng, x: number, y: number, rot = 0, seated = 4): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.box(-1.1, -0.3, 0.68, 2.2, 0.6, 0.08, C.ochre, { w: W_FINE });
  for (const o of [-0.62, 0.62]) pen.box(-1.1, o - 0.14, 0.4, 2.2, 0.28, 0.06, C.ochre, { w: W_FINE });
  for (const a of [-0.9, 0.9]) pen.pole([a, 0, 0], [a, 0, 0.68], 0.07, C.green, { ink: false });
  // a glass each
  for (let k = 0; k < 3; k++) pen.box(-0.7 + k * 0.6, -0.08, 0.76, 0.14, 0.14, 0.22, C.yellow, { edges: false, grain: 0.2 });
  pen.end();
  const spots: V2[] = [
    [-0.7, -0.62],
    [0.1, -0.62],
    [0.8, 0.62],
    [-0.2, 0.62],
    [0.75, -0.62],
    [-0.85, 0.62],
  ];
  for (let k = 0; k < Math.min(seated, spots.length); k++) person(pen, spots[k][0], spots[k][1], 0.22, randomLook(rng), "bust", spots[k][1] > 0);
  pen.pop();
}

/** A deckchair with (usually) somebody in it: a striped sling on a wooden frame, facing local +x. */
export function liegestuhl(pen: Pen, rng: Rng, x: number, y: number, rot = 0, color?: RGB, taken = true): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  const col = color ?? rng.pick([C.red, C.blue, C.yellow, C.teal, C.orange]);
  const sl = pen.plane([-0.55, -0.32, 0.95], [0, 1, 0], [1.2, 0, -0.8], 0, true);
  for (let k = 0; k < 4; k++) sl.rect(k * 0.16, 0, (k + 1) * 0.16, 1, k % 2 ? C.white : col, { grain: 0.6 });
  sl.loop(
    [
      [0, 0],
      [0.64, 0],
      [0.64, 1],
      [0, 1],
    ],
    { w: W_FINE },
  );
  for (const o of [-0.32, 0.32]) {
    pen.stroke(
      [
        [-0.6, o, 1.0],
        [0.75, o, 0.05],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [-0.45, o, 0.05],
        [0.3, o, 0.55],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
  if (taken) person(pen, 0.05, 0, 0.12, randomLook(rng), "sit", false);
  pen.pop();
}

/** A round fountain: a stone basin of water and a jet that the wind takes. */
export function fountain(pen: Pen, x: number, y: number, r: number, jet = 2.4, z = 0): void {
  pen.begin();
  pen.cyl(x, y, z, r, 0.45, C.stone, { seg: 16, top: C.stone });
  pen.floor(z + 0.46, 1).circle(x, y, r - 0.3, C.water, { kind: F_WATER, seg: 16, outline: true, w: W_FINE, ink: C.waterInk });
  pen.cyl(x, y, z + 0.45, 0.28, 0.5, C.stone, { seg: 8 });
  if (jet > 0) {
    pen.pole([x, y, z + 0.95], [x, y, z + 0.95 + jet], 0.13, C.white, { ink: false, sway: 0, swayB: 0.5 });
    const c = pen.card(x, y, z + 0.95 + jet);
    for (const s of [-1, 1]) {
      c.line(
        [
          [0, 0],
          [s * 0.35, 0.1],
          [s * 0.75, -0.5],
          [s * 0.95, -1.4],
        ],
        { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.4, sway: 0.5 },
      );
    }
  }
  pen.end();
}

/**
 * A Buddy Bear: the painted bear, arms up, that stands outside half the
 * hotels and embassies in town. About 2.2 tall.
 */
export function buddyBear(pen: Pen, x: number, y: number, color: RGB, z = 0, flip = false): void {
  pen.begin();
  pen.box(x - 0.5, y - 0.4, z, 1.0, 0.8, 0.14, C.stoneDark, { w: W_FINE });
  const c = pen.card(x, y, z + 0.14, flip);
  const dark = scaleRGB(color, 0.8);
  c.bar(-0.22, 0.1, -0.24, 0.6, 0.3, color);
  c.bar(0.22, 0.1, 0.24, 0.6, 0.3, color);
  c.ellipse(0, 0.95, 0.5, 0.58, color, { outline: true, w: W_FINE, layer: 1, seg: 12 });
  c.ellipse(0, 0.85, 0.28, 0.34, mixRGB(color, C.white, 0.5), { layer: 2, seg: 10, grain: 0.4 });
  c.bar(-0.4, 1.25, -0.72, 1.85, 0.24, color, { layer: 1 });
  c.bar(0.4, 1.25, 0.72, 1.85, 0.24, color, { layer: 1 });
  c.circle(0, 1.7, 0.36, color, { outline: true, w: W_FINE, layer: 3, seg: 10 });
  c.circle(-0.27, 2.0, 0.12, dark, { outline: true, w: W_FINE, layer: 2, seg: 6 });
  c.circle(0.27, 2.0, 0.12, dark, { outline: true, w: W_FINE, layer: 2, seg: 6 });
  c.ellipse(0, 1.6, 0.15, 0.11, mixRGB(color, C.white, 0.5), { layer: 4, seg: 8, grain: 0.3 });
  for (const e of [-0.13, 0.13]) c.seg(e, 1.76, e, 1.84, { w: 0.07, wobble: 0, layer: 5 });
  pen.end();
}

/** A dog, mid-walk. About 0.9 long. */
export function dog(pen: Pen, x: number, y: number, z = 0, color: RGB = C.woodDark, flip = false, s = 1): void {
  pen.push(x, y, z, 0, s);
  const c = pen.card(0, 0, 0, flip);
  pen.begin();
  for (const a of [-0.3, -0.18, 0.2, 0.32]) c.bar(a, 0.34, a + (a < 0 ? -0.05 : 0.05), 0.04, 0.09, color);
  c.ellipse(0, 0.45, 0.42, 0.2, color, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  c.circle(0.46, 0.66, 0.17, color, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  c.bar(0.56, 0.62, 0.7, 0.58, 0.09, color, { layer: 2 });
  c.bar(0.36, 0.78, 0.33, 0.9, 0.08, scaleRGB(color, 0.7), { layer: 3 });
  c.bar(-0.4, 0.52, -0.58, 0.74, 0.07, color, { layer: 1 });
  pen.end();
  pen.pop();
}

/** A swan on the water (z is the water's surface). */
export function swan(pen: Pen, x: number, y: number, z: number, flip = false): void {
  const c = pen.card(x, y, z, flip);
  pen.begin();
  c.ellipse(0, 0.2, 0.46, 0.22, C.white, { outline: true, w: W_FINE, seg: 10 });
  c.line(
    [
      [0.3, 0.3],
      [0.46, 0.55],
      [0.36, 0.82],
      [0.5, 0.9],
    ],
    { w: 0.11, color: C.white, kind: L_BAR, wobble: 0 },
  );
  c.seg(0.5, 0.9, 0.62, 0.86, { w: 0.07, color: C.orange, kind: L_MARK, wobble: 0, layer: 1 });
  pen.end();
}

/**
 * The pink pipes that snake round every building site, carrying groundwater
 * away: Berlin stands on sand with the water table just below. Give the run as
 * local points on the ground; the pipe rides on trestles overhead.
 */
export function pinkPipes(pen: Pen, pts: V2[], h = 3.0, z = 0): void {
  pen.begin();
  const run: V3[] = [[pts[0][0], pts[0][1], z + 0.2]];
  for (const p of pts) run.push([p[0], p[1], z + h]);
  const e = pts[pts.length - 1];
  run.push([e[0], e[1], z + 0.2]);
  pen.stroke(run, { w: 0.34, color: scaleRGB(C.pipePink, 0.72), kind: L_BAR, wobble: 0 });
  pen.stroke(run, { w: 0.24, color: C.pipePink, kind: L_BAR, wobble: 0, bias: 0.012 });
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      pen.stroke(
        [
          [x - 0.25, y, z],
          [x, y, z + h - 0.15],
          [x + 0.25, y, z],
        ],
        { w: 0.08, color: C.greyDark, kind: L_BAR, wobble: 0 },
      );
    }
  }
  pen.end();
}

/** A picnic: a blanket and two or three people who brought their own beer. */
export function picnic(pen: Pen, rng: Rng, x: number, y: number, z = 0, n = 2): void {
  const col = rng.pick([C.red, C.blue, C.yellow, C.pink, C.teal, C.white]);
  pen.floor(z, 2).rect(x - 1.05, y - 0.75, x + 1.05, y + 0.75, col, { outline: true, w: W_FINE });
  const spots: V2[] = [
    [-0.45, 0],
    [0.5, 0.2],
    [0.05, -0.45],
  ];
  for (let k = 0; k < Math.min(n, 3); k++) person(pen, x + spots[k][0], y + spots[k][1], z - 0.2, randomLook(rng), "sit", k === 1);
}

/** People standing in a line from (x, y), one every 0.8 along (dx, dy): for a museum, a club, a currywurst. */
export function queue(pen: Pen, rng: Rng, x: number, y: number, n: number, dx: number, dy: number, z = 0, look?: (k: number) => Look): void {
  const l = Math.hypot(dx, dy) || 1;
  for (let k = 0; k < n; k++) {
    const j = rng.range(-0.12, 0.12);
    person(pen, x + (dx / l) * k * 0.8 - (dy / l) * j, y + (dy / l) * k * 0.8 + (dx / l) * j, z, look ? look(k) : randomLook(rng), rng.pick(["stand", "stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.1) ? 0.72 : 1);
  }
}

/** Germany's flag on a pole (or Berlin's, with its bear, or Europe's): the cloth sways. */
export function flagOf(pen: Pen, x: number, y: number, z: number, h: number, which: "de" | "berlin" | "eu" = "de", size = 1): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.1, C.white);
  const c = pen.card(x, y, z + h - 1.15 * size);
  const w = 1.8 * size;
  const hh = 1.1 * size;
  const bands = which === "de" ? FLAG_DE : which === "berlin" ? FLAG_BERLIN : [[43, 76, 155] as RGB];
  bands.forEach((rgb, i) => c.rect(0.05, (hh * i) / bands.length, w, (hh * (i + 1)) / bands.length, rgb, { sway: 0.5, grain: 0.5, layer: 1 }));
  if (which === "berlin") {
    // the bear, rampant, as well as a few strokes can make him
    c.ellipse(w * 0.5, hh * 0.47, hh * 0.16, hh * 0.22, C.black, { sway: 0.5, layer: 2, seg: 8, grain: 0.3 });
    c.circle(w * 0.56, hh * 0.72, hh * 0.1, C.black, { sway: 0.5, layer: 2, seg: 6, grain: 0.3 });
    c.seg(w * 0.56, hh * 0.56, w * 0.7, hh * 0.66, { w: 0.07 * size, color: C.black, kind: L_MARK, sway: 0.5, wobble: 0, layer: 2 });
  } else if (which === "eu") {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      c.circle(w * 0.5 + Math.cos(a) * hh * 0.3, hh * 0.5 + Math.sin(a) * hh * 0.3, 0.05 * size, C.yellow, { sway: 0.5, layer: 2, seg: 5, grain: 0 });
    }
  }
  c.loop(
    [
      [0.05, 0],
      [w, 0],
      [w, hh],
      [0.05, hh],
    ],
    { w: W_FINE, sway: 0.5, layer: 3 },
  );
  pen.end();
}
