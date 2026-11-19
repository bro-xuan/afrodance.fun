// Sample places, so a new city renders from the first minute: a square with a
// church tower and a market, terraces of houses round a courtyard, and a park.
// They read FRAME through city.ts, so they work in a canal city and a street
// city alike. Replace them one by one with the real places (one file each),
// and use them as patterns: objects that assemble piece by piece, people in
// little scenes, a mover or two, and a close-up spot.

import { RGB, V2, V3 } from "../../engine/math";
import { F_WATER, L_BAR, L_MARK, Pen } from "../../engine/pen";
import { BLOCK, QUAY } from "../city";
import {
  W_FINE,
  W_THIN,
  archWindow,
  bench,
  bikeRow,
  cafeTable,
  flowerBed,
  hedge,
  houseRow,
  lamp,
  person,
  randomLook,
  speckle,
  stall,
  tree,
  tufts,
} from "../kit";
import { Route, makeSprite, rounded, walker } from "../motion";
import { C, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

/** How far in from every edge a place keeps its own things: clear of the city's quay or sidewalk. */
const E = QUAY + 0.8;
const B = BLOCK;

/** A loop for walkers through a place, in local coordinates. */
function stroll(c: BlockCtx, pts: V2[], z = 0): Route {
  return new Route(
    rounded(
      pts.map((p) => [c.ox + p[0], c.oy + p[1], c.oz + z] as V3),
      true,
      1.2,
    ),
    true,
  );
}

function gull(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.42 : -0.12;
  cd.bar(-0.95, y, -0.32, 0.1, 0.14, C.white);
  cd.bar(0.95, y, 0.32, 0.1, 0.14, C.white);
  cd.ellipse(0, 0, 0.36, 0.17, C.white, { outline: true, w: W_FINE, seg: 8, layer: 1 });
  cd.rect(0.3, -0.04, 0.5, 0.05, C.yellow, { layer: 2, grain: 0 });
}

/** Birds wheeling round a point high up (a tower, a mast): a mover that never stops. */
function gulls(c: BlockCtx, x: number, y: number, z: number): void {
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => gull(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 4; k++) {
    const r = 4.5 + k * 1.4;
    const sp = (0.5 + 0.09 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 5 + ph) & 1;
      // which way it crosses the page decides which way it faces
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + x + Math.cos(a) * r, c.oy + y + Math.sin(a) * r * 0.8, c.oz + z + Math.sin(m.t * 0.7 + ph) * 1.2, born);
    });
  }
}

// ---------------------------------------------------------------- the square

/** Where the final close-up looks, if the tour ends here: local x, y and a zoom (2 to 3 is close). */
export const squareSpot: [number, number, number] = [B * 0.6, B * 0.66, 2.6];

/** A church with a tall tower, a market, cafés and a crowd. */
export const square: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(B * 0.52, B * 0.5);
  c.early(() => {
    pen.floor(0, 1).rect(E, E, B - E, B - E, C.plaza);
    speckle(pen.floor(0, 2), E, E, B - E, B - E, C.stoneDark, 0.14);
  });

  // the church along the back, its tower at the end nearest the camera's right
  const nx = E + 0.5;
  const ny = E + 0.5;
  const nl = B * 0.32;
  const nd = 7;
  pen.obj(() => {
    pen.box(nx, ny, 0, nl, nd, 7.2, C.brick);
    const f = pen.wall("y+", nx, ny, 0, nl, nd);
    const n = Math.max(3, Math.floor(nl / 2.3));
    for (let i = 0; i < n; i++) {
      const a = 0.6 + (i * (nl - 1.2)) / n;
      archWindow(f, a + 0.25, 1.5, a + (nl - 1.2) / n - 0.25, 6.2, rng.chance(0.75), C.stone);
    }
    f.rect(0, 6.75, nl, 7.2, C.stone, { grain: 0.4, layer: 0 });
  });
  pen.obj(() => pen.gable(nx - 0.3, ny - 0.3, 7.2, nl + 0.3, nd + 0.6, 3.9, "x", C.slate, { gable: C.brick }), 0.15);
  const tx = nx + nl;
  const ty = ny + 1.2;
  const tw = 4.6;
  pen.obj(() => {
    pen.box(tx, ty, 0, tw, tw, 15, C.brick);
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, tx, ty, 0, tw, tw);
      for (const b of [4.9, 9.7]) f.rect(0, b, tw, b + 0.32, C.stone, { grain: 0.4 });
      archWindow(f, tw / 2 - 0.5, 5.9, tw / 2 + 0.5, 8.6, false, C.stone);
      // the clock
      f.circle(tw / 2, 12.3, 1.38, C.charcoal, { layer: 1, seg: 18, grain: 0.4 });
      f.circle(tw / 2, 12.3, 1.18, C.white, { outline: true, w: W_FINE, layer: 2, seg: 18, grain: 0.3 });
      f.seg(tw / 2, 12.3, tw / 2 - 0.5, 12.75, { w: 0.11, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      f.seg(tw / 2, 12.3, tw / 2 + 0.72, 12.72, { w: 0.08, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      if (side === "x+") f.rect(tw / 2 - 0.8, 0, tw / 2 + 0.8, 2.6, C.door, { outline: true, w: W_THIN, layer: 1 });
    }
  });
  pen.obj(() => pen.box(tx - 0.28, ty - 0.28, 15, tw + 0.56, tw + 0.56, 0.5, C.stone), 0.14);
  pen.obj(() => {
    const w = tw - 1.1;
    pen.box(tx + 0.55, ty + 0.55, 15.5, w, w, 3.4, C.stone);
    for (const side of ["x+", "y+"] as const) archWindow(pen.wall(side, tx + 0.55, ty + 0.55, 15.5, w, w), w * 0.28, 0.4, w * 0.72, 2.9, false, C.quayCap);
  }, 0.28);
  const sx = tx + tw / 2;
  const sy = ty + tw / 2;
  pen.obj(() => {
    pen.pyramid(tx + 0.45, ty + 0.45, 18.9, tw - 0.9, tw - 0.9, 7.5, C.copper);
    pen.pole([sx, sy, 26.3], [sx, sy, 27.6], 0.07, C.gold, { ink: false });
  }, 0.42);
  gulls(c, sx, sy, 22);

  // the market in front, cafés along the right
  const goods: RGB[][] = [TULIP.slice(), [C.yellow, C.gold, C.ochre], [C.red, C.orange, C.grass, C.yellow]];
  const signs = ["FLOWERS", "CHEESE", "FRUIT"];
  for (let k = 0; k < 3; k++) {
    pen.push(E + 1 + k * 4.4, B * 0.44, 0, 0);
    stall(pen, rng, { w: 3.6, sign: signs[k], goods: goods[k], a: [C.green, C.orange, C.red][k] });
    pen.pop();
  }
  for (let i = 0; i < 10; i++) {
    person(pen, rng.range(E + 1, E + 14), rng.range(B * 0.44 + 3, B * 0.44 + 5), 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
  for (let k = 0; k < 4; k++) cafeTable(pen, rng, B - E - 2 - (k % 2) * 3.4, B * 0.5 + k * 3.1, k % 2 ? C.yellow : C.red, 2 + (k % 2));
  bench(pen, E + 2, B - E - 2, 0);
  person(pen, E + 1.6, B - E - 2, 0.3, randomLook(rng), "sit", false);
  person(pen, E + 2.4, B - E - 2, 0.3, randomLook(rng), "sit", true);
  // a busker with a ring of listeners: a little scene, not a scatter of people
  const bx = B * 0.42;
  const by = B * 0.72;
  person(pen, bx, by, 0, randomLook(rng), "cheer", false);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 1.6 + 0.6;
    person(pen, bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.2, 0, randomLook(rng), k % 3 ? "stand" : "wave", Math.cos(a) > 0, k === 2 ? 0.72 : 1);
  }
  for (const [x, y] of [
    [E + 2, B * 0.4],
    [B - E - 2, B * 0.4],
    [E + 2, B - E - 5],
  ]) {
    lamp(pen, x, y);
  }
  tree(pen, rng, B - E - 1.5, E + 2, { kind: "round" });
  tree(pen, rng, B - E - 1.5, B - E - 1.5, { kind: "round" });
  bikeRow(pen, rng, B * 0.55, B - E - 1.2, 6, 270, 0.62);

  const route = stroll(c, [
    [E + 0.8, B * 0.4],
    [B - E - 0.8, B * 0.4],
    [B - E - 0.8, B - E - 0.8],
    [E + 0.8, B - E - 0.8],
  ]);
  for (let k = 0; k < 6; k++) c.movers.push(walker(route, rng, c.done + rng.range(0, 1)));
};

// ---------------------------------------------------------------- terraces

/** Two terraces of tall narrow houses round a courtyard garden with washing on the line. */
export const terrace: BlockBuilder = (c) => {
  const { pen, rng } = c;
  const depth = 7;
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E + depth + 0.4, E + depth + 0.4, B - E, B - E, C.grass, { outline: true, w: W_THIN });
    tufts(pen.floor(0, 2), E + depth + 0.6, E + depth + 0.6, B - E - 0.2, B - E - 0.2, 0.4);
    g.rect(B * 0.5, E + depth + 0.4, B * 0.5 + 2, B - E, C.path, { layer: 1 });
  });
  // one row along the back facing +y, one along the left facing +x
  const span = B - 2 * E;
  const widths = [4.6, 5, 4.4, 5.2, 4.8];
  const fit = (len: number) => {
    let n = 0;
    let used = 0;
    while (used + widths[n % widths.length] <= len) used += widths[n++ % widths.length];
    return n;
  };
  pen.push(E + depth, E, 0, 0);
  houseRow(pen, rng, fit(span - depth), { widths, shopEvery: 3 });
  pen.pop();
  pen.push(E, B - E, 0, 270);
  houseRow(pen, rng, fit(span - depth), { widths, shopEvery: 4 });
  pen.pop();
  // the courtyard
  const x0 = E + depth + 1.5;
  const y0 = E + depth + 1.5;
  const w = B - E - x0;
  pen.obj(() => {
    pen.pole([x0 + 1, y0 + w * 0.3, 0], [x0 + 1, y0 + w * 0.3, 2.1], 0.09, C.white);
    pen.pole([x0 + w * 0.45, y0 + w * 0.3, 0], [x0 + w * 0.45, y0 + w * 0.3, 2.1], 0.09, C.white);
    pen.stroke(
      [
        [x0 + 1, y0 + w * 0.3, 2.0],
        [x0 + w * 0.45, y0 + w * 0.3, 2.0],
      ],
      { w: 0.04, kind: L_BAR, wobble: 0 },
    );
    for (let k = 0; k < 5; k++) {
      const cd = pen.card(x0 + 1.8 + k * ((w * 0.45 - 2) / 5), y0 + w * 0.3, 1.15);
      const ww = rng.range(0.45, 0.7);
      cd.rect(-ww / 2, 0, ww / 2, 0.85, rng.pick([C.red, C.blue, C.yellow, C.white, C.pink]), { outline: true, w: W_FINE, sway: 0.3 });
    }
  });
  for (let k = 0; k < 4; k++) tree(pen, rng, x0 + rng.range(w * 0.55, w - 1.5), y0 + rng.range(1.5, w - 1.5), { kind: rng.pick(["round", "blossom", "round"]) });
  hedge(pen, x0, y0 + w - 1.2, w * 0.4, 0.8);
  flowerBed(pen, rng, x0 + 0.5, y0 + w * 0.55, 3.5, 2.2, TULIP.slice(0, 4));
  bench(pen, x0 + w * 0.3, y0 + w * 0.75, 90);
  person(pen, x0 + w * 0.3, y0 + w * 0.75, 0.3, randomLook(rng), "sit", false);
  for (let k = 0; k < 5; k++) person(pen, x0 + rng.range(1, w - 1), y0 + rng.range(w * 0.4, w - 1), 0, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5), rng.chance(0.4) ? 0.72 : 1);
};

// ---------------------------------------------------------------- the park

/** Lawns, a pond with a fountain, a bandstand, trees of every kind, and people making the most of it. */
export const park: BlockBuilder = (c) => {
  const { pen, rng } = c;
  const px = B * 0.36;
  const py = B * 0.6;
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E, E, B - E, B - E, C.grass, { outline: true, w: W_THIN });
    tufts(pen.floor(0, 2), E + 0.3, E + 0.3, B - E - 0.3, B - E - 0.3, 0.35, (a, b) => Math.hypot(a - px, (b - py) * 1.3) > 7);
    // a sand path in a loop
    const ring: V2[] = [];
    for (let k = 0; k <= 40; k++) {
      const t = (k / 40) * Math.PI * 2;
      ring.push([B / 2 + Math.cos(t) * (B / 2 - E - 3), B / 2 + Math.sin(t) * (B / 2 - E - 3)]);
    }
    g.line(ring, { w: 1.6, color: C.path, kind: L_MARK, wobble: 0.4, layer: 1 });
    // the pond
    g.ellipse(px, py, 6, 4.6, C.water, { kind: F_WATER, layer: 1, outline: true, w: W_THIN, ink: C.waterInk, seg: 28 });
  });
  // fountain
  pen.obj(() => {
    pen.cyl(px, py, -0.1, 0.8, 0.5, C.stone, { seg: 10 });
    pen.pole([px, py, 0.4], [px, py, 1.6], 0.12, C.white, { ink: false });
  });
  // the bandstand
  const bx = B * 0.68;
  const by = B * 0.34;
  pen.obj(() => {
    pen.cyl(bx, by, 0, 3, 0.7, C.white, { seg: 10, top: C.wood });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      pen.pole([bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6, 0.7], [bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6, 3.2], 0.12, C.white);
    }
    pen.cone(bx, by, 3.2, 3.4, 2.2, C.copper, { seg: 10 });
  });
  for (let k = 0; k < 4; k++) person(pen, bx - 1.2 + k * 0.8, by + (k % 2) * 0.6, 0.7, randomLook(rng), k === 1 ? "cheer" : "stand", k % 2 === 0);
  // trees round the edge, never on the path or the pond
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const r = B / 2 - E - rng.range(0.8, 1.6);
    tree(pen, rng, B / 2 + Math.cos(a) * r, B / 2 + Math.sin(a) * r, { kind: rng.pick(["round", "tall", "blossom", "round", "elm"]) });
  }
  // picnics and sunbathers on the lawn
  for (let k = 0; k < 4; k++) {
    const x = rng.range(B * 0.45, B * 0.62);
    const y = rng.range(B * 0.5, B * 0.66);
    pen.floor(0, 2).rect(x - 1, y - 0.7, x + 1, y + 0.7, rng.pick([C.red, C.blue, C.yellow]), { outline: true, w: W_FINE });
    person(pen, x - 0.4, y, -0.2, randomLook(rng), "sit", false);
    person(pen, x + 0.5, y + 0.2, -0.2, randomLook(rng), "sit", true);
  }
  // a kite on a string, tugging in the wind
  const kx = B * 0.5;
  const ky = B * 0.44;
  person(pen, kx, ky, 0, randomLook(rng), "cheer", false, 0.72);
  const kite = makeSprite((p) => {
    const cd = p.card(0, 0, 0);
    cd.poly(
      [
        [0, 0.9],
        [0.6, 0],
        [0, -1.1],
        [-0.6, 0],
      ],
      C.red,
      { outline: true, w: W_FINE },
    );
    cd.seg(0, -1.1, 0.3, -2.3, { w: 0.05, color: C.yellow, kind: L_MARK });
  });
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const x = c.ox + kx - 2 + Math.sin(m.clock * 0.9) * 0.8;
    const y = c.oy + ky - 6;
    const z = c.oz + 12 + Math.sin(m.clock * 1.3) * 0.6;
    if (!m.sees(x, y, z, 10)) return;
    m.put(kite, x, y, z, c.done);
    m.pen.stroke(
      [
        [c.ox + kx + 0.3, c.oy + ky, c.oz + 1.6],
        [x, y, z - 1],
      ],
      { w: 0.04, kind: L_BAR, wobble: 0, alpha: 0.8 },
    );
  });
  const route = stroll(c, Array.from({ length: 24 }, (_, k): V2 => [B / 2 + Math.cos((k / 24) * Math.PI * 2) * (B / 2 - E - 3), B / 2 + Math.sin((k / 24) * Math.PI * 2) * (B / 2 - E - 3)]));
  for (let k = 0; k < 7; k++) c.movers.push(walker(route, rng, c.done + rng.range(0, 1)));
};

/** Pick a sample for a block that has no drawing of its own yet, by its position. */
export function sampleFor(i: number, j: number): BlockBuilder {
  const k = (i * 7 + j * 3) % 3;
  return k === 0 ? park : terrace;
}
