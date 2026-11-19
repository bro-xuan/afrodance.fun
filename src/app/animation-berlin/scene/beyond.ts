// What the Spree carries just upstream of the Oberbaumbrücke, where it has
// left the city's base and runs over the bare paper: the Molecule Man, three
// aluminium giants leaning together in mid-stream, and the Badeschiff, an old
// barge turned swimming pool, moored off a beach bar of trucked-in sand.

import { RGB, Rng, V2, V3 } from "../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, Pen } from "../engine/pen";
import { liegestuhl } from "./berlin";
import { REACH_S, RX0, WATER, Y1 } from "./grid";
import { W_FINE, W_THIN, person, randomLook } from "./kit";
import { makeSprite } from "./motion";
import { C } from "./palette";
import { Mover } from "./types";

const ALU: RGB = [208, 213, 217];

/** Three flat figures, a hundred feet tall and full of holes, meeting in the middle of the river. */
function moleculeMan(pen: Pen, x: number, y: number, z: number): void {
  const s = 1.3;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const r = 2.35 * s;
    const bx = x + Math.cos(a) * r;
    const by = y + Math.sin(a) * r;
    pen.obj(() => {
      // each stands on the river bed and leans in towards the other two
      const p = pen.plane([bx, by, z], [-Math.cos(a) * s, -Math.sin(a) * s, 0], [-Math.cos(a) * 0.2 * s, -Math.sin(a) * 0.2 * s, s], 0, true);
      p.poly(
        [
          [-0.95, 0],
          [0.95, 0],
          [1.05, 3.9],
          [1.25, 5.2],
          [2.25, 6.0],
          [2.25, 7.0],
          [1.1, 7.1],
          [0.75, 7.6],
          [-0.85, 7.6],
          [-1.2, 5.0],
        ],
        ALU,
        { outline: true, w: W_THIN, grain: 0.5, glow: 0.15 },
      );
      p.circle(-0.05, 8.45, 0.86, ALU, { outline: true, w: W_THIN, seg: 10, grain: 0.5, glow: 0.15 });
      // the holes: the molecules he is made of
      p.ticks(-0.8, 0.4, 0.9, 7.3, { n: 60, len: 0.16, ang: 0, jit: 1.5, color: C.metal, w: 0.17, layer: 1 });
      p.seg(-1.1, 0.04, 1.1, 0.04, { w: 0.22, color: C.waterDeep, kind: L_MARK, wobble: 0.6, layer: 1 });
    }, k * 0.12);
  }
}

/** A palm in a pot, as every beach bar on the Spree has. */
function palm(pen: Pen, x: number, y: number, z: number): void {
  pen.begin();
  pen.cyl(x, y, z, 0.34, 0.5, C.tile, { seg: 7 });
  pen.pole([x, y, z + 0.5], [x + 0.15, y, z + 2.5], 0.16, C.woodDark);
  const c = pen.card(x + 0.15, y, z + 2.5);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI + 0.26;
    c.line(
      [
        [0, 0],
        [Math.cos(a) * 0.7, Math.sin(a) * 0.7 + 0.2],
        [Math.cos(a) * 1.3, Math.sin(a) * 0.8 - 0.25],
      ],
      { w: 0.16, color: k % 2 ? C.leafDark : C.hedge, kind: L_BAR, wobble: 0, sway: 0.4 },
    );
  }
  pen.end();
}

/**
 * Lay what stands beyond the base. `t` is when it starts to draw; movers
 * appear from `born`.
 */
export function beyond(pen: Pen, movers: Mover[], t: number, born: number): void {
  const rng = new Rng(6021);
  const keep = pen.reveal;
  pen.reveal = (x, y) => t + Math.max(0, y - Y1) * 0.02;
  pen.push(0, 0, WATER);

  // ---- the Molecule Man, in mid-stream between the two lanes the boats keep to
  const mm = REACH_S.find((p) => p.u === 45) ?? REACH_S[15];
  moleculeMan(pen, mm.x, mm.y, 0);

  // ---- the beach bar on the west bank, on the paper just south of the viaduct
  const bx = RX0 - 15.5;
  const by = Y1 + 6;
  const sand: V2[] = [];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a);
    sand.push([bx + 8 + Math.cos(a) * 8.6 * r, by + 8.5 + Math.sin(a) * 9.4 * r]);
  }
  pen.obj(() => {
    pen.extrude(sand, 0, 0.45, C.sand, { top: C.sand, w: W_THIN, crease: 40 });
    pen.floor(0.45, 1).ticks(bx, by, bx + 16, by + 17, {
      n: 70,
      len: 0.3,
      ang: 0.4,
      jit: 1,
      color: C.ochre,
      w: 0.06,
      inside: (a, b) => Math.hypot((a - bx - 8) / 8, (b - by - 8.5) / 8.8) < 1,
    });
  });
  const top = 0.45;
  pen.push(0, 0, top);
  // the bar: a hut with a reed roof and a board
  pen.obj(() => {
    pen.box(bx + 2.2, by + 3, 0, 3.6, 2.4, 2.3, C.wood);
    const f = pen.wall("y+", bx + 2.2, by + 3, 0, 3.6, 2.4);
    f.rect(0.3, 0.95, 3.3, 1.95, C.charcoal, { outline: true, w: W_THIN, glow: 0.6, layer: 1 });
    f.block(0.2, 0.86, 3.4, 0.96, 0.4, C.woodDark, { w: W_FINE });
    const sg = pen.plane([bx + 2.2, by + 5.42, 2.3], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0.3, 0.05, 3.3, 0.7, C.white, { outline: true, w: W_FINE });
    sg.text("STRANDBAR", 1.8, 0.2, 0.3, { align: "c", layer: 1, w: 0.055 });
  });
  pen.obj(() => pen.hip(bx + 1.8, by + 2.6, 2.3, 4.4, 3.2, 1.3, C.ochre, { inset: 1.2 }), 0.15);
  person(pen, bx + 4, by + 5.15, 0.2, randomLook(rng), "bust", false);
  for (const [dx, dy] of [
    [3.2, 6.6],
    [4.4, 7.0],
  ]) {
    person(pen, bx + dx, by + dy, 0, randomLook(rng), "stand", rng.chance(0.5));
  }
  // deckchairs facing the water, parasols, palms, bulbs on a string
  const chairs: V2[] = [
    [8.6, 4.2],
    [9.4, 6.4],
    [8.2, 8.8],
    [9.8, 10.6],
    [7.0, 11.6],
    [9.0, 13.2],
    [5.4, 13.4],
    [11.2, 8.2],
  ];
  chairs.forEach(([dx, dy], k) => liegestuhl(pen, rng, bx + dx, by + dy, 8 + ((k * 13) % 17) - 8, undefined, k !== 3));
  for (const [dx, dy, col] of [
    [7.4, 6.0, C.red],
    [7.2, 10.2, C.yellow],
  ] as [number, number, RGB][]) {
    pen.obj(() => {
      pen.pole([bx + dx, by + dy, 0], [bx + dx, by + dy, 2.4], 0.08, C.white);
      pen.cone(bx + dx, by + dy, 2.15, 1.5, 0.55, col, { seg: 8, crease: 0.5 });
    });
  }
  palm(pen, bx + 6.2, by + 3.4, 0);
  palm(pen, bx + 2.0, by + 9.4, 0);
  palm(pen, bx + 11.6, by + 12.6, 0);
  pen.obj(() => {
    const posts: V3[] = [
      [bx + 1.6, by + 6.4, 0],
      [bx + 6.6, by + 8.2, 0],
      [bx + 11.6, by + 5.6, 0],
    ];
    for (const p of posts) pen.pole(p, [p[0], p[1], 2.9], 0.09, C.woodDark);
    for (let k = 0; k + 1 < posts.length; k++) {
      const a = posts[k];
      const b = posts[k + 1];
      const line: V3[] = [];
      for (let q = 0; q <= 8; q++) {
        const u = q / 8;
        line.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 2.85 - Math.sin(u * Math.PI) * 0.45]);
      }
      pen.stroke(line, { w: 0.04, kind: L_BAR, wobble: 0 });
      for (let q = 1; q < 8; q++) {
        pen.stroke(
          [
            [line[q][0] - 0.02, line[q][1], line[q][2] - 0.08],
            [line[q][0] + 0.02, line[q][1], line[q][2] - 0.08],
          ],
          { w: 0.3, kind: L_LIGHT, wobble: 0 },
        );
      }
    }
  });
  for (const [dx, dy] of [
    [4.6, 9.6],
    [5.6, 10.4],
    [3.4, 12.2],
    [12.2, 10.4],
  ]) {
    person(pen, bx + dx, by + dy, 0, randomLook(rng), rng.pick(["stand", "wave", "sit"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  pen.pop();

  // ---- the Badeschiff: a barge full of blue water, a deck round it, a gangway from the beach
  const px = RX0 + 2.6;
  const py = Y1 + 8.5;
  const pw = 6.4;
  const pl = 13;
  pen.obj(() => {
    pen.box(px, py, -0.1, pw, pl, 0.75, C.blueDark, { top: C.wood, w: 0.11 });
    pen.floor(0.66, 1).rect(px + 0.8, py + 0.8, px + pw - 0.8, py + pl - 0.8, [112, 214, 226], { kind: F_WATER, outline: true, w: W_THIN, ink: C.white });
    for (const o of [2.4, 4.0]) pen.floor(0.66, 2).seg(px + o, py + 1, px + o, py + pl - 1, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.3, alpha: 0.8 });
    // the gangway, in two sections, from the sand
    pen.box(bx + 15.6, py + 5.4, 0.3, px - (bx + 15.6), 1.3, 0.14, C.wood, { w: W_THIN });
    for (const yy of [py + 5.4, py + 6.7]) {
      pen.stroke(
        [
          [bx + 15.6, yy, 1.1],
          [px, yy, 1.1],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
  });
  for (let k = 0; k < 6; k++) person(pen, px + rng.range(1.3, pw - 1.3), py + rng.range(1.6, pl - 1.6), -0.25, randomLook(rng), "bust", rng.chance(0.5));
  for (const [dx, dy] of [
    [0.4, 2.5],
    [0.4, 9.5],
    [pw - 0.4, 4.2],
  ]) {
    person(pen, px + dx, py + dy, 0.3, randomLook(rng), "sit", dx > 1);
  }
  person(pen, bx + 17.4, py + 6.05, 0.44, randomLook(rng), "walkA", false);
  pen.pop();
  pen.reveal = keep;

  // somebody swimming lengths, and somebody who cannot wait to get in
  const swimmer = makeSprite((p) => person(p, 0, 0, 0, randomLook(new Rng(77)), "bust", false), 0, 77);
  const swimmerBack = makeSprite((p) => person(p, 0, 0, 0, randomLook(new Rng(77)), "bust", true), 0, 77);
  const jumper = makeSprite((p) => person(p, 0, 0, 0, randomLook(new Rng(78)), "cheer", false, 0.72), 0, 78);
  movers.push((m) => {
    if (m.t < born) return;
    const len = pl - 3.2;
    const ph = (m.t * 0.8) % (2 * len);
    const d = ph < len ? ph : 2 * len - ph;
    m.put(ph < len ? swimmer : swimmerBack, px + 3.2, py + 1.6 + d, WATER + 0.42, born);
    // every few seconds a child runs up, jumps, and is gone under
    const u = (m.t % 5.2) / 5.2;
    if (u < 0.3) {
      const k = u / 0.3;
      m.put(jumper, px + 0.5 + k * 1.6, py + 6.1, WATER + 0.75 + Math.sin(k * Math.PI) * 1.3 - k * 0.6, born);
    } else if (u < 0.42) {
      const f = (u - 0.3) / 0.12;
      const c = m.pen.card(px + 2.1, py + 6.1, WATER + 0.7);
      for (let q = 0; q < 7; q++) {
        const a = 0.35 + (q / 6) * (Math.PI - 0.7);
        c.seg(Math.cos(a) * 0.3 * (1 + f), Math.sin(a) * 0.3 * (1 + f), Math.cos(a) * (0.6 + f * 0.7), Math.sin(a) * (0.6 + f * 0.9), { w: 0.09, color: C.white, kind: L_MARK, wobble: 0, alpha: 1 - f });
      }
    }
  });
}
