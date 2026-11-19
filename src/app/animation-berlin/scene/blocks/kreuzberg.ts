// Kreuzberg: the hill in Viktoriapark that the district is named after, a
// waterfall down its side and the iron monument on its top; Checkpoint
// Charlie on the pavement where the Wall crossed Friedrichstraße, and the
// tethered balloon that goes up beside it; tenements with a kebab shop, a
// Späti and a bar downstairs and paint on every wall; the Turkish market, the
// longest queue in Berlin, table tennis on a concrete table, a slackline, a
// drum circle; and a jetty on the Spree.
//
// The river is the block's east edge (local x = 48). The street along the
// north edge is where the city has laid the Wall's cobbles, and the U1 runs
// on its viaduct just beyond the south edge.

import { RGB, Rng, V2, V3, hex, scaleRGB, smooth } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, Pen } from "../../engine/pen";
import { altbauRow, dog, imbiss, picnic, queue } from "../berlin";
import { hullShape } from "../boats";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, bike, bikeRow, person, randomLook, stall, tree } from "../kit";
import { Route, cyclist, makeSprite, rounded, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** Cast iron, painted green a long time ago. */
const IRON: RGB = hex("#3f5d4e");
const OLIVE: RGB = hex("#6f7450");

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
function bulbs(pen: Pen, pts: V3[], sag = 0.5): void {
  pen.begin();
  for (const p of pts) pen.pole([p[0], p[1], 0], p, 0.1, C.greyDark);
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

/** A bird, wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

// ---------------------------------------------------------------- the hill

const HILL: V2 = [12.3, 12.0];
const TIERS = [
  { r: 6.8, z: 2.8, ph: 0.7 },
  { r: 4.8, z: 5.3, ph: 2.1 },
  { r: 2.9, z: 7.4, ph: 4.0 },
];

/** How far a tier reaches from the middle of the hill, by direction: it wanders a little, as a contour would. */
function reach(k: number, t: number): number {
  const { r, ph } = TIERS[k];
  return r * (1 + 0.06 * Math.sin(3 * t + ph) + 0.04 * Math.sin(5 * t + ph * 2));
}

function at(k: number, t: number, grow = 0): V2 {
  const r = reach(k, t) + grow;
  return [HILL[0] + Math.cos(t) * r, HILL[1] + Math.sin(t) * r * 0.97];
}

/** The Kreuzberg: three contours of grass, a path up, a waterfall down, and Schinkel's iron spire on top. */
function hill(c: BlockCtx): void {
  const { pen, rng } = c;
  const side = scaleRGB(C.grass, 0.8);
  // the south-east, where the water comes down: towards the camera
  const SE = Math.PI / 4;
  TIERS.forEach((tier, k) => {
    const z0 = k === 0 ? 0 : TIERS[k - 1].z;
    const foot: V2[] = [];
    for (let i = 0; i < 20; i++) foot.push(at(k, (i / 20) * Math.PI * 2));
    pen.obj(() => {
      pen.extrude(foot, z0, tier.z, side, { top: C.grass, crease: 30 });
      pen.floor(tier.z, 1).ticks(HILL[0] - tier.r, HILL[1] - tier.r, HILL[0] + tier.r, HILL[1] + tier.r, {
        n: Math.round(tier.r * tier.r * 2.2),
        len: 0.42,
        ang: 0.9,
        jit: 0.5,
        color: C.grassDark,
        w: 0.06,
        inside: (a, b) => Math.hypot(a - HILL[0], (b - HILL[1]) / 0.97) < reach(k, Math.atan2(b - HILL[1], a - HILL[0])) - 0.4,
      });
    }, k * 0.14);
  });

  // the path: round each terrace, with steps cut into the slope between them
  pen.obj(() => {
    const arc = (k: number, r: number, t0: number, t1: number): V2[] => {
      const pts: V2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = t0 + ((t1 - t0) * i) / 12;
        pts.push([HILL[0] + Math.cos(t) * r, HILL[1] + Math.sin(t) * r * 0.97]);
      }
      return pts;
    };
    pen.floor(TIERS[0].z, 2).line(arc(0, 5.75, Math.PI * 0.98, Math.PI * 0.36), { w: 0.6, color: C.path, kind: L_MARK, wobble: 0.5 });
    pen.floor(TIERS[1].z, 2).line(arc(1, 3.85, Math.PI * 0.86, Math.PI * 0.4), { w: 0.55, color: C.path, kind: L_MARK, wobble: 0.5 });
    for (const [k, t] of [
      [0, Math.PI * 0.62],
      [1, Math.PI * 0.72],
      [2, Math.PI * 0.56],
    ]) {
      const z0 = k === 0 ? 0 : TIERS[k - 1].z;
      const p = at(k, t, 0.04);
      const tx = -Math.sin(t) * 0.45;
      const ty = Math.cos(t) * 0.45;
      for (let z = z0 + 0.3; z < TIERS[k].z; z += 0.42) {
        pen.stroke(
          [
            [p[0] - tx, p[1] - ty, z],
            [p[0] + tx, p[1] + ty, z],
          ],
          { w: 0.17, color: C.path, kind: L_MARK, wobble: 0 },
        );
      }
    }
  }, 0.3);

  // the waterfall: a spring by the monument, three falls, and a pool at the foot
  pen.obj(() => {
    const top = at(2, SE, -1.0);
    pen.floor(TIERS[2].z, 3).ellipse(top[0], top[1], 0.75, 0.55, C.water, { kind: F_WATER, outline: true, w: W_FINE, ink: C.waterInk, seg: 10 });
    for (let k = 2; k >= 0; k--) {
      const edge = at(k, SE, 0.03);
      const z0 = k === 0 ? 0 : TIERS[k - 1].z;
      const h = TIERS[k].z - z0;
      const w = 1.3 + (2 - k) * 0.3;
      // the stream across the terrace above, to the lip
      const from = k === 2 ? top : at(k + 1, SE, 0.3);
      pen.floor(TIERS[k].z, 3).poly(
        [
          [from[0] - 0.42, from[1] + 0.42],
          [from[0] + 0.42, from[1] - 0.42],
          [edge[0] + w * 0.36, edge[1] - w * 0.36],
          [edge[0] - w * 0.36, edge[1] + w * 0.36],
        ],
        C.water,
        { kind: F_WATER, outline: true, w: W_FINE, ink: C.waterInk },
      );
      // the fall itself, on a card across the slope
      const cd = pen.card(edge[0], edge[1], z0);
      cd.rect(-w / 2, 0, w / 2, h + 0.03, C.glassPale, { grain: 0.3, layer: 1, sway: 0.08 });
      for (let i = 0; i < 6; i++) {
        const a = -w / 2 + 0.14 + (i * (w - 0.28)) / 5;
        cd.seg(a, 0.12, a + rng.range(-0.05, 0.05), h - rng.range(0, 0.25), { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.6, sway: 0.25, layer: 2 });
        if (i % 2) cd.seg(a + 0.1, h * 0.25, a + 0.1, h * 0.75, { w: 0.05, color: C.waterInk, kind: L_MARK, wobble: 0.5, sway: 0.25, layer: 2 });
      }
      cd.ellipse(0, 0.12, w * 0.62, 0.26, C.white, { layer: 3, seg: 10, grain: 0.2, sway: 0.1 });
    }
    const pool = at(0, SE, 1.3);
    pen.floor(0, 2).ellipse(pool[0], pool[1], 1.8, 1.25, C.water, { kind: F_WATER, outline: true, w: W_THIN, ink: C.waterInk, seg: 16 });
    // rocks beside the water
    for (const [k, t, g] of [
      [0, SE + 0.3, 0.5],
      [0, SE - 0.32, 0.6],
      [1, SE + 0.38, 0.3],
      [1, SE - 0.4, 0.35],
      [2, SE + 0.5, 0.2],
    ]) {
      const p = at(k, t, g);
      const z0 = k === 0 ? 0 : TIERS[k - 1].z;
      const s = rng.range(0.45, 0.75);
      pen.box(p[0] - s / 2, p[1] - s / 2, z0, s, s * 0.8, s * 0.7, C.stoneDark, { w: W_THIN });
    }
  }, 0.4);

  // the monument: a stepped base, a Gothic spire of cast iron, a cross
  const mx = HILL[0] - 0.4;
  const my = HILL[1] - 0.5;
  const mz = TIERS[2].z;
  pen.obj(() => {
    pen.box(mx - 1.3, my - 1.3, mz, 2.6, 2.6, 0.45, C.stone, { w: W_THIN });
    pen.box(mx - 0.9, my - 0.9, mz + 0.45, 1.8, 1.8, 0.45, C.stoneDark, { w: W_THIN });
  }, 0.5);
  pen.obj(() => {
    pen.cyl(mx, my, mz + 0.9, 0.62, 3.6, IRON, { seg: 8, r2: 0.44 });
    // a pinnacle at each corner, and pointed niches round the shaft
    for (const [ox, oy] of [
      [-0.72, -0.72],
      [0.72, -0.72],
      [0.72, 0.72],
      [-0.72, 0.72],
    ]) {
      pen.pole([mx + ox, my + oy, mz + 0.9], [mx + ox, my + oy, mz + 3.2], 0.18, IRON);
      pen.cone(mx + ox, my + oy, mz + 3.2, 0.16, 0.7, IRON, { seg: 5 });
    }
    const cd = pen.card(mx, my, mz + 0.9);
    for (const a of [-0.28, 0, 0.28]) {
      cd.line(
        [
          [a - 0.1, 0.5],
          [a - 0.1, 1.5],
          [a, 1.75],
          [a + 0.1, 1.5],
          [a + 0.1, 0.5],
        ],
        { w: 0.045, color: scaleRGB(IRON, 0.6), kind: L_MARK, wobble: 0, layer: 2 },
      );
    }
  }, 0.62);
  pen.obj(() => {
    pen.cyl(mx, my, mz + 4.5, 0.44, 1.5, IRON, { seg: 8, r2: 0.34 });
    pen.cone(mx, my, mz + 6.0, 0.5, 2.5, IRON, { seg: 8 });
    pen.pole([mx, my, mz + 8.4], [mx, my, mz + 9.5], 0.11, IRON);
    pen.stroke(
      [
        [mx - 0.34, my + 0.34, mz + 9.1],
        [mx + 0.34, my - 0.34, mz + 9.1],
      ],
      { w: 0.11, color: IRON, kind: L_BAR, wobble: 0 },
    );
  }, 0.75);

  // trees on its back, and people on their way up
  for (const [k, t, g] of [
    [0, 3.5, -0.9],
    [0, 4.2, -1.0],
    [0, 5.0, -0.8],
    [0, 5.7, -0.9],
    [0, 2.7, -0.8],
    [1, 3.9, -0.8],
    [1, 4.9, -0.7],
    [1, 2.9, -0.7],
  ]) {
    const p = at(k, t, g);
    tree(pen, rng, p[0], p[1], { kind: rng.pick(["round", "tall", "round"]), z: TIERS[k].z });
  }
  for (const [k, t, g, pose] of [
    [0, Math.PI * 0.52, -1.0, "walkA"],
    [0, Math.PI * 0.44, -1.1, "walkB"],
    [0, Math.PI * 0.12, -0.9, "stand"],
    [1, Math.PI * 0.66, -0.9, "walkA"],
    [1, Math.PI * 0.08, -0.8, "wave"],
    [2, Math.PI * 0.74, -0.7, "stand"],
    [2, Math.PI * 0.02, -0.55, "cheer"],
  ] as [number, number, number, "walkA" | "walkB" | "stand" | "wave" | "cheer"][]) {
    const p = at(k, t, g);
    person(pen, p[0], p[1], TIERS[k].z, randomLook(rng), pose, rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  // two with their legs over the edge of the top, looking at the city
  for (const t of [Math.PI * 0.3, Math.PI * 0.36]) {
    const p = at(2, t, -0.25);
    person(pen, p[0], p[1], TIERS[2].z - 0.2, randomLook(rng), "sit", false);
  }
}

// ---------------------------------------------------------------- Checkpoint Charlie

/** The Stars and Stripes on a pole, as near as thirteen stripes will go into seven. */
function oldGlory(pen: Pen, x: number, y: number, z: number, h: number): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.09, C.white);
  const cd = pen.card(x, y, z + h - 1.05);
  for (let k = 0; k < 7; k++) cd.rect(0.05, (k * 1.0) / 7, 1.7, ((k + 1) * 1.0) / 7, k % 2 ? C.white : C.red, { sway: 0.5, grain: 0.5, layer: 1 });
  cd.rect(0.05, 3 / 7, 0.75, 1.0, C.blueDark, { sway: 0.5, grain: 0.5, layer: 2 });
  cd.loop(
    [
      [0.05, 0],
      [1.7, 0],
      [1.7, 1.0],
      [0.05, 1.0],
    ],
    { w: W_FINE, sway: 0.5, layer: 3 },
  );
  pen.end();
}

/** The guard hut in the middle of the street, its sandbags, the two signs everybody photographs. */
function checkpoint(c: BlockCtx, x: number, y: number): void {
  const { pen, rng } = c;
  const w = 3.8;
  const d = 2.3;
  pen.obj(() => {
    pen.box(x, y, 0, w, d, 2.5, C.white);
    const f = pen.wall("y+", x, y, 0, w, d);
    f.rect(0.35, 0.95, 1.45, 2.0, C.glass, { outline: true, w: W_FINE, glow: 0.7, layer: 1 });
    f.rect(1.75, 0, 2.6, 2.05, C.white, { outline: true, w: W_THIN, layer: 1 });
    f.rect(1.9, 1.1, 2.45, 1.85, C.glass, { layer: 2, glow: 0.7 });
    f.rect(2.9, 0.95, 3.5, 2.0, C.glass, { outline: true, w: W_FINE, glow: 0.7, layer: 1 });
    for (let b = 0.3; b < 2.4; b += 0.3) f.seg(0.05, b, w - 0.05, b, { w: 0.03, color: C.stoneDark, kind: L_MARK, wobble: 0.2 });
    const g = pen.wall("x+", x, y, 0, w, d);
    g.rect(0.5, 0.95, d - 0.5, 2.0, C.glass, { outline: true, w: W_FINE, glow: 0.7, layer: 1 });
    for (let b = 0.3; b < 2.4; b += 0.3) g.seg(0.05, b, d - 0.05, b, { w: 0.03, color: C.stoneDark, kind: L_MARK, wobble: 0.2 });
  });
  pen.obj(() => {
    pen.box(x - 0.35, y - 0.3, 2.5, w + 0.7, d + 0.95, 0.2, C.white, { w: W_THIN });
    // its name along the front of the roof
    const sg = pen.plane([x - 0.2, y + d + 0.66, 2.7], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, w + 0.4, 0.95, C.white, { outline: true, w: W_FINE });
    sg.text("US ARMY", (w + 0.4) / 2, 0.55, 0.28, { align: "c", layer: 1, w: 0.06 });
    sg.text("CHECKPOINT", (w + 0.4) / 2, 0.12, 0.28, { align: "c", layer: 1, w: 0.06 });
  }, 0.15);
  // sandbags, three courses high, with a way through
  pen.obj(() => {
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 7; k++) {
        const a = x - 0.5 + k * 0.72 + (row % 2) * 0.36;
        if (a > x + 1.55 && a < x + 2.45) continue;
        pen.box(a, y + d + 1.0, row * 0.26, 0.68, 0.5, 0.26, row % 2 ? C.sand : C.sandstone, { w: W_FINE });
      }
    }
  }, 0.2);
  oldGlory(pen, x - 0.9, y + 0.6, 0, 5.6);

  // the soldier's portrait on its tall post (the other side shows the other army's)
  pen.obj(() => {
    const px = x + w + 2.0;
    const py = y + 1.6;
    pen.pole([px, py, 0], [px, py, 3.6], 0.14, C.greyDark);
    const cd = pen.card(px, py, 3.6);
    cd.rect(-0.95, 0, 0.95, 2.5, C.glassPale, { outline: true, w: 0.11, layer: 1 });
    cd.poly(
      [
        [-0.8, 0.08],
        [0.8, 0.08],
        [0.66, 0.95],
        [0.25, 1.12],
        [-0.25, 1.12],
        [-0.66, 0.95],
      ],
      OLIVE,
      { outline: true, w: W_FINE, layer: 2 },
    );
    cd.circle(0, 1.5, 0.42, [238, 187, 150], { outline: true, w: W_FINE, layer: 3, seg: 10 });
    cd.poly(
      [
        [-0.5, 1.72],
        [0.5, 1.72],
        [0.42, 2.12],
        [-0.42, 2.12],
      ],
      OLIVE,
      { outline: true, w: W_FINE, layer: 4 },
    );
    cd.seg(-0.55, 1.72, 0.55, 1.72, { w: 0.09, color: C.black, kind: L_MARK, wobble: 0, layer: 5 });
    for (const e of [-0.15, 0.15]) cd.seg(e, 1.46, e, 1.56, { w: 0.07, wobble: 0, layer: 5 });
  }, 0.3);
  // and the board
  pen.obj(() => {
    const bx = x - 2.9;
    const by = y + d + 0.4;
    for (const o of [-1.35, 1.35]) pen.pole([bx + o * 0.577, by - o * 0.577, 0], [bx + o * 0.577, by - o * 0.577, 1.5], 0.1, C.white);
    const cd = pen.card(bx, by, 1.4);
    cd.rect(-1.75, 0, 1.75, 1.75, C.white, { outline: true, w: 0.11, layer: 1 });
    cd.text("YOU ARE LEAVING", 0, 1.22, 0.24, { align: "c", layer: 2, w: 0.055, wobble: 0.2 });
    cd.text("THE AMERICAN", 0, 0.72, 0.28, { align: "c", layer: 2, w: 0.065, wobble: 0.2 });
    cd.text("SECTOR", 0, 0.2, 0.3, { align: "c", layer: 2, w: 0.07, wobble: 0.2 });
  }, 0.3);

  // an actor in an old uniform with a flag, a euro a photograph; and the photographers
  const actor: Look = { skin: [238, 187, 150], hair: [74, 48, 32], top: OLIVE, legs: OLIVE, long: false, hat: OLIVE };
  person(pen, x + 2.1, y + d + 2.0, 0, actor, "stand", false);
  oldGlory(pen, x + 2.55, y + d + 2.0, 0, 3.2);
  person(pen, x + 1.3, y + d + 2.1, 0, randomLook(rng), "cheer", true);
  for (let k = 0; k < 9; k++) {
    const a = 0.25 + (k / 8) * (Math.PI - 0.5);
    person(pen, x + 2.0 + Math.cos(a) * rng.range(2.6, 3.6) * 1.25, y + d + 2.1 + Math.sin(a) * rng.range(1.0, 1.9), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), Math.cos(a) > 0, rng.chance(0.15) ? 0.72 : 1);
  }
}

// ---------------------------------------------------------------- the balloon

const BALLOON_R = 3.3;
/** Paper circles are this much bigger than the spheres they outline, in this projection. */
const ISO = 1.2247;

/** The tethered balloon and its ring of a gondola, drawn with the gondola's floor at z = 0. */
function balloon(p: Pen, rng: Rng): void {
  const r = BALLOON_R;
  const cz = r + 2.3;
  const seg = 12;
  const rings = 8;
  const verts: V3[] = [];
  for (let k = 0; k <= rings; k++) {
    const ph = -Math.PI / 2 + (k / rings) * Math.PI;
    // (a little narrower below, as an envelope full of helium is)
    const rr = Math.cos(ph) * r * (ph < 0 ? 1 + ph * 0.12 : 1);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      verts.push([Math.cos(a) * rr, Math.sin(a) * rr, cz + Math.sin(ph) * r]);
    }
  }
  const faces: number[][] = [];
  const cols: RGB[] = [];
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      faces.push([k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i]);
      cols.push(i % 2 ? C.white : C.blue);
    }
  }
  p.solid(verts, faces, cols, { edges: false, glow: 0.1 });
  // its outline, and the name it flies under, on a card in front of it
  const cd = p.card(r * 0.62, r * 0.62, cz + r * 0.62);
  cd.circle(0, 0, r * ISO, null, { ink: C.ink, w: 0.12, seg: 22 });
  cd.rect(-2.75, -0.95, 2.75, 0.95, C.white, { outline: true, w: W_THIN, layer: 1, glow: 0.4 });
  cd.text("WELT", 0, -0.55, 1.1, { align: "c", color: C.blueDark, kind: L_MARK, w: 0.2, wobble: 0.2, layer: 2 });
  // the net down to the gondola
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.stroke(
      [
        [Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, cz - r * 0.5],
        [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.9],
      ],
      { w: 0.04, kind: L_BAR, wobble: 0 },
    );
  }
  p.cyl(0, 0, 0, 1.3, 0.75, C.charcoal, { seg: 12, top: C.greyDark });
  for (let i = 0; i < 6; i++) {
    const a = -0.5 + (i / 5) * 2.6;
    person(p, Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.3, randomLook(rng), "bust", i % 2 === 0, 0.8);
  }
  // a lamp under the envelope, for the night
  p.stroke(
    [
      [0.4, 0.4, 2.2],
      [0.4, 0.4, 2.3],
    ],
    { w: 2.6, kind: L_LIGHT, wobble: 0, alpha: 0.35 },
  );
}

// ---------------------------------------------------------------- the place

export const kreuzberg: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(23.5, 23.5, 0.97);

  // ---- the ground
  c.early(() => {
    const g = pen.floor(0, 1);
    // setts round the checkpoint, grass in the middle, the market's worn square
    g.rect(20.2, E, B - E, 12.6, C.cobble);
    g.rect(15.2, 21.5, 28.9, 30.0, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(15.4, 21.7, 28.7, 29.8, { n: 80, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    g.rect(14.3, 31.6, B - E, B - E, C.plaza);
    pen.floor(0, 2).ticks(14.6, 31.9, B - E - 0.3, B - E - 0.3, { n: 110, len: 0.3, ang: -0.78, jit: 0.2, color: C.stoneDark, w: 0.06 });
    // a slab of asphalt under the table-tennis table
    g.rect(22.9, 24.6, 28.4, 28.0, C.stoneDark, { layer: 1, grain: 0.9 });
  });

  hill(c);

  // ---- the north pavement: a stall of fur hats, Checkpoint Charlie, and the balloon
  pen.push(20.6, E + 0.3, 0);
  stall(pen, rng, { w: 3.6, sign: "SOUVENIR", goods: [C.brickBrown, C.charcoal, C.greyDark, C.woodDark], a: C.green });
  pen.pop();
  for (let k = 0; k < 2; k++) person(pen, 21.6 + k * 1.2, E + 3.3, 0, { ...randomLook(rng), hat: k ? C.brickBrown : null }, "stand", k === 1);
  checkpoint(c, 27.6, E + 0.5);

  // the balloon's landing stage: a round deck, the winch, a ticket hut and the next flight waiting
  const BX = 40.3;
  const BY = 8.5;
  pen.obj(() => {
    pen.cyl(BX, BY, 0, 2.7, 0.5, C.concrete, { seg: 16, top: C.stone });
    pen.cyl(BX, BY, 0.5, 0.6, 0.45, C.charcoal, { seg: 8 });
  });
  pen.obj(() => {
    pen.box(36.4, E + 0.2, 0, 2.0, 1.7, 2.3, C.blue, { top: C.white });
    const f = pen.wall("y+", 36.4, E + 0.2, 0, 2.0, 1.7);
    f.rect(0.3, 0.9, 1.7, 1.75, C.glass, { outline: true, w: W_FINE, glow: 0.7 });
    f.text("TICKETS", 1.0, 1.9, 0.2, { align: "c", color: C.white, kind: L_MARK, w: 0.045 });
  });
  queue(pen, rng, 36.9, 7.1, 5, 0, 1);
  const sprite = makeSprite((p) => balloon(p, new Rng(77)), 0, 71);
  const LO = 1.5;
  const HI = 16.2;
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const st = c.stay();
    let u: number;
    if (st) {
      // down to load before the camera comes, up as it arrives, down again when it has gone, and up for the evening
      const up = st.at - 1.2;
      const leave = st.leave + 1.0;
      if (m.t < up) u = 1 - smooth(up - 10, up - 5.5, m.t);
      else if (m.t < leave) u = smooth(up, st.at + 2.2, m.t);
      else u = 1 - smooth(leave, leave + 5, m.t) + smooth(leave + 11, leave + 19, m.t);
    } else {
      const k = (m.t - c.done) % 44;
      u = smooth(0, 10, k) - smooth(22, 32, k);
    }
    const z = LO + (HI - LO) * u + Math.sin(m.t * 0.8) * 0.14 * u;
    const wx = c.ox + BX;
    const wy = c.oy + BY;
    if (!m.sees(wx, wy, c.oz + z + 6, 30)) return;
    m.put(sprite, wx, wy, c.oz + z, c.done);
    m.pen.stroke(
      [
        [wx, wy, c.oz + 0.9],
        [wx, wy, c.oz + z],
      ],
      { w: 0.06, color: C.charcoal, kind: L_BAR, wobble: 0 },
    );
  });

  // ---- tenements along the west side, facing the park: kebab, Späti, bar, records, and an astronaut on the end wall
  pen.push(E, B - E, 0, 270);
  altbauRow(pen, rng, 4, {
    widths: [5.5],
    graffiti: 0.85,
    shops: ["doner", "spaeti", "bar", "records"],
    end: (f, d, h) => {
      f.rect(0.35, 2.9, d - 0.35, h - 0.5, [240, 236, 226], { layer: 1, grain: 0.7 });
      const cx = d * 0.46;
      const cy = h * 0.55;
      const ink = C.black;
      // adrift: helmet, pack, arms out, and in one glove the string of a red balloon
      f.rect(cx - 1.45, cy - 0.7, cx - 0.85, cy + 0.9, C.greyDark, { outline: true, w: 0.1, ink, layer: 2 });
      f.bar(cx - 0.55, cy - 0.85, cx - 1.0, cy - 2.3, 0.5, C.white, { layer: 2, ink });
      f.bar(cx + 0.55, cy - 0.85, cx + 0.8, cy - 2.4, 0.5, C.white, { layer: 2, ink });
      f.bar(cx - 0.85, cy + 0.55, cx - 2.0, cy + 1.25, 0.44, C.white, { layer: 2, ink });
      f.bar(cx + 0.85, cy + 0.5, cx + 1.9, cy + 0.15, 0.44, C.white, { layer: 2, ink });
      f.poly(
        [
          [cx - 0.95, cy + 1.0],
          [cx + 0.95, cy + 1.0],
          [cx + 1.02, cy - 0.95],
          [cx - 1.02, cy - 0.95],
        ],
        C.white,
        { outline: true, w: 0.13, ink, layer: 3 },
      );
      f.rect(cx - 0.4, cy - 0.3, cx + 0.4, cy + 0.3, C.concrete, { outline: true, w: 0.07, ink, layer: 4 });
      f.circle(cx + 0.05, cy + 1.95, 1.0, C.white, { outline: true, w: 0.14, ink, layer: 4, seg: 14 });
      f.ellipse(cx + 0.2, cy + 1.9, 0.62, 0.5, C.charcoal, { layer: 5, seg: 12, grain: 0.3 });
      f.arc(cx + 0.2, cy + 1.9, 0.4, 0.3, 0.6, 1.9, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 6, seg: 5 });
      f.line(
        [
          [cx + 1.95, cy + 0.15],
          [cx + 2.25, cy + 1.6],
          [cx + 2.1, cy + 2.6],
        ],
        { w: 0.06, color: ink, kind: L_MARK, wobble: 0.4, layer: 4 },
      );
      f.ellipse(cx + 2.1, cy + 3.2, 0.52, 0.64, C.red, { outline: true, w: 0.09, ink, layer: 4, seg: 12 });
      // the line that should be holding him
      f.line(
        [
          [cx - 1.45, cy - 0.2],
          [cx - 2.4, cy - 1.0],
          [cx - 2.1, cy - 2.2],
          [cx - 2.9, cy - 3.2],
        ],
        { w: 0.08, color: ink, kind: L_MARK, wobble: 0.8, layer: 2 },
      );
      for (const [a, b] of [
        [1.0, h - 1.5],
        [d - 1.2, h - 2.4],
        [1.4, h - 5.0],
        [d - 0.9, 4.2],
      ]) {
        f.seg(a - 0.16, b, a + 0.16, b, { w: 0.06, color: ink, kind: L_MARK, wobble: 0, layer: 2 });
        f.seg(a, b - 0.16, a, b + 0.16, { w: 0.06, color: ink, kind: L_MARK, wobble: 0, layer: 2 });
      }
    },
  });
  pen.pop();
  bikeRow(pen, rng, 21.0, 9.6, 5, 270, 0.62);

  // ---- a short row across the middle: a café, a bakery, and a tree full of birds on the fire wall
  pen.push(30.5, 22, 0);
  altbauRow(pen, rng, 2, {
    widths: [6.55],
    graffiti: 0.6,
    shops: ["cafe", "bakery"],
    end: (f, d, h) => {
      f.bar(d * 0.5, 0.4, d * 0.5, h * 0.48, 0.7, C.brickBrown, { layer: 1 });
      f.bar(d * 0.5, h * 0.36, d * 0.3, h * 0.56, 0.36, C.brickBrown, { layer: 1 });
      f.bar(d * 0.5, h * 0.4, d * 0.72, h * 0.6, 0.36, C.brickBrown, { layer: 1 });
      const leaves: RGB[] = [C.teal, C.pink, C.yellow, C.orange, C.grassLight, C.purple, C.sky, C.red];
      for (let k = 0; k < 15; k++) {
        const a = (k / 15) * Math.PI * 2;
        const r = 1.1 + (k % 3) * 0.75;
        f.circle(d * 0.5 + Math.cos(a) * r * 1.05, h * 0.66 + Math.sin(a) * r * 0.85, 0.72, leaves[k % leaves.length], { outline: true, w: W_FINE, layer: 2, seg: 9, grain: 0.5 });
      }
      for (const [a, b] of [
        [d * 0.3, h * 0.62],
        [d * 0.66, h * 0.74],
        [d * 0.52, h * 0.86],
      ]) {
        f.ellipse(a, b, 0.3, 0.18, C.black, { layer: 3, seg: 8, grain: 0.2 });
        f.seg(a + 0.28, b + 0.03, a + 0.46, b - 0.02, { w: 0.07, color: C.orange, kind: L_MARK, wobble: 0, layer: 3 });
      }
    },
  });
  pen.pop();

  // ---- the lawn: a slackline, a drum circle, picnics, and the table-tennis table
  const TA: V3 = [16.4, 23.3, 1.15];
  const TB: V3 = [22.3, 23.0, 1.15];
  tree(pen, rng, TA[0], TA[1], { kind: "elm", h: 2.6, r: 1.6 });
  tree(pen, rng, TB[0], TB[1], { kind: "elm", h: 2.8, r: 1.7 });
  tree(pen, rng, 27.6, 22.6, { kind: "round" });
  tree(pen, rng, 16.0, 29.0, { kind: "blossom" });
  person(pen, 17.3, 24.5, 0, randomLook(rng), "cheer", false);
  person(pen, 21.0, 24.4, -0.2, randomLook(rng), "sit", true);
  dog(pen, 22.0, 24.9, 0, C.woodDark, true);
  // the slackliner: out along the line and back, arms wide, never quite falling
  const lineLook = randomLook(rng);
  const liner = [makeSprite((p) => person(p, 0, 0, 0, lineLook, "cheer", false), 0, 21), makeSprite((p) => person(p, 0, 0, 0, lineLook, "wave", true), 0, 22)];
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const ax = c.ox + TA[0];
    const ay = c.oy + TA[1];
    if (!m.sees(ax + 3, ay, c.oz + 1, 10)) return;
    const u = 0.5 + 0.34 * Math.sin(m.t * 0.33);
    const sag = 0.42 * 4 * u * (1 - u) + 0.06;
    const x = ax + (TB[0] - TA[0]) * u;
    const y = ay + (TB[1] - TA[1]) * u + Math.sin(m.t * 2.7) * 0.07;
    const z = c.oz + TA[2] - sag + Math.sin(m.t * 5.3) * 0.03;
    m.pen.stroke(
      [
        [ax, ay, c.oz + TA[2]],
        [x, y, z],
        [c.ox + TB[0], c.oy + TB[1], c.oz + TB[2]],
      ],
      { w: 0.07, color: C.yellow, kind: L_BAR, wobble: 0 },
    );
    m.put(liner[Math.sin(m.t * 2.7) > 0.55 ? 1 : 0], x, y, z, c.done);
  });
  // drums
  const dcx = 19.3;
  const dcy = 27.4;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    const x = dcx + Math.cos(a) * 1.7;
    const y = dcy + Math.sin(a) * 1.25;
    person(pen, x, y, -0.2, randomLook(rng), "sit", Math.cos(a) > 0);
    pen.obj(() => pen.cyl(x - Math.cos(a) * 0.55, y - Math.sin(a) * 0.4, 0, 0.2, 0.5, C.wood, { seg: 7, r2: 0.26, top: C.cream }));
  }
  person(pen, dcx - 0.2, dcy + 0.1, 0, randomLook(rng), "cheer", false);
  person(pen, dcx + 0.5, dcy - 0.2, 0, randomLook(rng), "wave", true, 0.72);
  picnic(pen, rng, 25.4, 22.9, 0, 3);
  picnic(pen, rng, 17.0, 21.0 + 5.6, 0, 2);

  // table tennis: a concrete table, an iron net, two players and a ball that never stops
  const tx = 25.65;
  const ty = 26.3;
  pen.obj(() => {
    pen.box(tx - 1.37, ty - 0.76, 0.66, 2.74, 1.52, 0.1, C.concrete, { w: W_THIN });
    for (const o of [-0.9, 0.9]) pen.box(tx + o - 0.18, ty - 0.5, 0, 0.36, 1.0, 0.66, C.concreteDark, { w: W_FINE });
    pen.stroke(
      [
        [tx, ty - 0.8, 0.9],
        [tx, ty + 0.8, 0.9],
      ],
      { w: 0.07, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    pen.floor(0.76, 1).seg(tx - 1.37, ty, tx + 1.37, ty, { w: 0.04, color: C.white, kind: L_MARK, wobble: 0 });
  });
  const pl = [randomLook(rng), randomLook(rng)];
  const players = pl.map((lk, i) => [makeSprite((p) => person(p, 0, 0, 0, lk, "stand", i === 1), 0, 31 + i), makeSprite((p) => person(p, 0, 0, 0, lk, "wave", i === 1), 0, 33 + i)]);
  person(pen, tx - 0.3, ty + 1.9, 0, randomLook(rng), "stand", false, 0.72);
  person(pen, tx + 0.7, ty + 2.0, 0, randomLook(rng), "cheer", true);
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const wx = c.ox + tx;
    const wy = c.oy + ty;
    if (!m.sees(wx, wy, c.oz + 1, 8)) return;
    const beat = m.t / 0.92;
    const n = Math.floor(beat);
    const u = beat - n;
    const dir = n % 2 ? -1 : 1;
    const x = wx + dir * (-1.55 + 3.1 * u);
    // off the bat, over the net, one bounce on the far half, up to the other bat
    const s = u < 0.7 ? u / 0.7 : (u - 0.7) / 0.3;
    const z = u < 0.7 ? 0.8 + 0.38 * (1 - s) * (1 + 1.9 * s) : 0.8 + 0.38 * s * (2 - s);
    const y = wy + Math.sin(n * 2.4) * 0.3 * (1 - 2 * Math.abs(u - 0.5));
    m.pen.card(x, y, c.oz + z).circle(0, 0, 0.1, C.orange, { seg: 6, grain: 0, outline: true, w: 0.04 });
    // whoever the ball is at swings
    const hitL = (dir < 0 && u > 0.82) || (dir > 0 && u < 0.16);
    const hitR = (dir > 0 && u > 0.82) || (dir < 0 && u < 0.16);
    m.put(players[0][hitL ? 1 : 0], wx - 2.25, wy + 0.2, c.oz, c.done);
    m.put(players[1][hitR ? 1 : 0], wx + 2.25, wy - 0.2, c.oz, c.done);
  });

  // ---- the kebab kiosk, and the longest queue in Berlin: down, along, and back up again
  pen.push(14.8, 32.0, 0);
  imbiss(pen, rng, { sign: "GEMÜSE KEBAP", queue: 0, board: C.green });
  pen.pop();
  queue(pen, rng, 16.7, 35.7, 6, 0, 1);
  queue(pen, rng, 17.5, 40.6, 6, 1, 0);
  queue(pen, rng, 22.3, 39.8, 6, 0, -1);
  dog(pen, 19.2, 41.5, 0, C.cream, false);

  // ---- the Turkish market: two rows of stalls and everybody's shopping
  const row1 = ["OBST", "GEMÜSE", "OLIVEN", "BROT", "STOFFE"];
  const goods1: RGB[][] = [
    [C.red, C.orange, C.yellow, C.grass],
    [C.grass, C.leafDark, C.red, C.purple],
    [C.leafDark, C.black, C.hedge, C.ochre],
    [C.ochre, C.wood, C.sand, C.woodDark],
    [C.pink, C.teal, C.purple, C.yellow],
  ];
  row1.forEach((sign, k) => {
    pen.push(23.5 + k * 3.5, 33.2, 0);
    stall(pen, rng, { w: 3.4, sign, goods: goods1[k], a: [C.red, C.green, C.yellow, C.orange, C.blue][k] });
    pen.pop();
  });
  for (let k = 0; k < 14; k++) {
    person(pen, 24 + k * 1.22 + rng.range(-0.3, 0.3), 35.75 + rng.range(0, 1.2), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.14) ? 0.72 : 1);
  }
  const row2 = ["KÄSE", "GEWÜRZE", "FISCH", "TEE"];
  const goods2: RGB[][] = [
    [C.yellow, C.cream, C.ochre, C.gold],
    [C.red, C.orange, C.ochre, C.brickBrown],
    [C.slateLight, C.glassPale, C.metal, C.pink],
    [C.gold, C.brickRose, C.green, C.copper],
  ];
  row2.forEach((sign, k) => {
    pen.push(29.4 + k * 3.5, 39.6, 0);
    stall(pen, rng, { w: 3.4, sign, goods: goods2[k], a: [C.yellow, C.red, C.blue, C.green][k] });
    pen.pop();
  });
  for (let k = 0; k < 9; k++) {
    person(pen, 29.9 + k * 1.5 + rng.range(-0.3, 0.3), 42.05 + rng.range(0, 1.1), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.14) ? 0.72 : 1);
  }
  // bolts of cloth hung out at the end of the first row
  pen.obj(() => {
    const ry = 34.1;
    pen.pole([41.3, ry, 0], [41.3, ry, 2.3], 0.07, C.greyDark);
    pen.pole([43.4, ry, 0], [43.4, ry, 2.3], 0.07, C.greyDark);
    pen.stroke(
      [
        [41.3, ry, 2.3],
        [43.4, ry, 2.3],
      ],
      { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    for (let k = 0; k < 5; k++) {
      const cd = pen.card(41.55 + k * 0.42, ry, 0.5);
      cd.rect(-0.19, 0, 0.19, 1.8, [C.pink, C.teal, C.yellow, C.purple, C.red][k], { outline: true, w: W_FINE, sway: 0.18 });
    }
  });
  // the tea seller, with his samovar on a trolley
  pen.obj(() => {
    pen.box(41.7, 35.9, 0.3, 1.1, 0.7, 0.5, C.woodDark, { w: W_FINE });
    pen.cyl(42.0, 36.25, 0.8, 0.22, 0.62, C.gold, { seg: 8 });
    pen.cone(42.0, 36.25, 1.42, 0.2, 0.22, C.gold, { seg: 8 });
    for (let k = 0; k < 3; k++) pen.box(42.35 + k * 0.13, 36.1, 0.8, 0.09, 0.09, 0.16, C.brickRose, { edges: false, grain: 0.2 });
  });
  person(pen, 42.4, 35.6, 0, { ...randomLook(rng), top: C.white }, "stand", true);
  person(pen, 41.2, 36.9, 0, randomLook(rng), "stand", false);
  bulbs(pen, [
    [23.4, 35.55, 3.2],
    [32.2, 35.55, 3.2],
    [41.0, 35.55, 3.2],
  ]);
  bulbs(pen, [
    [29.3, 41.95, 3.2],
    [36.4, 41.95, 3.2],
    [43.4, 41.95, 3.2],
  ]);
  // a cargo bike with the children in the box, parked while the shopping is done
  pen.push(25.4, 42.5, 0, 12);
  bike(pen, { cargo: true, rider: null, color: C.teal });
  pen.pop();
  person(pen, 24.2, 42.6, 0, randomLook(rng), "stand", false);

  // ---- the jetty: steps down from the gap in the railing, a deck on the water, two kayaks
  const wz = c.waterZ;
  pen.obj(() => {
    for (let k = 0; k < 6; k++) {
      const top = -0.45 * (k + 1);
      pen.box(B, 22.4 + k * 0.5, wz, 0.95, 0.5, top - wz, C.wood, { w: W_FINE });
    }
    pen.box(B, 25.4, wz, 1.85, 2.5, 0.55, C.wood, { top: C.wood, w: W_THIN });
    pen.floor(wz + 0.55, 1).ticks(B + 0.05, 25.45, B + 1.8, 27.85, { n: 9, len: 1.6, ang: 0, jit: 0.02, color: C.woodDark, w: 0.05 });
    for (const y of [25.5, 27.8]) pen.pole([B + 1.75, y, wz - 0.2], [B + 1.75, y, wz + 1.1], 0.14, C.woodDark);
  });
  person(pen, B + 1.6, 26.1, wz + 0.35, randomLook(rng), "sit", false);
  person(pen, B + 1.6, 26.95, wz + 0.35, randomLook(rng), "sit", false);
  for (const [y, col] of [
    [29.3, C.orange],
    [20.6, C.yellow],
  ] as [number, RGB][]) {
    pen.push(B + 0.75, y, wz, 90);
    pen.obj(() => {
      pen.extrude(hullShape(3.0, 0.78, 0.42), -0.05, 0.28, col, { top: scaleRGB(col, 0.8), crease: 28, w: 0.09 });
      pen.floor(0.28, 1).ellipse(-0.1, 0, 0.45, 0.2, C.black, { seg: 8, grain: 0.3 });
    });
    pen.pop();
  }

  // ---- everything else that moves
  // through the market, between the two rows
  const aisle = stroll(
    c,
    [
      [24.3, 37.75],
      [43.0, 37.75],
      [43.0, 38.85],
      [24.3, 38.85],
    ],
    0.5,
  );
  for (let k = 0; k < 8; k++) c.movers.push(walker(aisle, rng, c.done + rng.range(0, 1)));
  // bicycles round the lawn
  const lawn = stroll(
    c,
    [
      [14.6, 20.75],
      [29.7, 20.75],
      [29.7, 30.85],
      [14.6, 30.85],
    ],
    1.2,
  );
  for (let k = 0; k < 3; k++) c.movers.push(cyclist(lawn, rng, c.done + rng.range(0, 1), rng.range(3.0, 3.8)));
  // pigeons round the monument
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 4; k++) {
    const r = 2.6 + k * 1.0;
    const sp = (0.55 + 0.08 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 6 + ph) & 1;
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + HILL[0] + Math.cos(a) * r, c.oy + HILL[1] + Math.sin(a) * r * 0.8, c.oz + 17.8 + Math.sin(m.t * 0.7 + ph) * 1.0, born);
    });
  }
};
