// Greenwich: the islet where the river leaves the page. The Royal Observatory
// stands on its hill at the front, and the Prime Meridian runs from its
// courtyard straight up the page: down across the park, between the twin domes
// of the old naval college, to the river. The Cutty Sark sits in her glass dry
// dock by the water, with the pier and a river bus beside her. People stand
// astride the line to have their picture taken, a class is told which
// hemisphere it is in, deer graze, somebody flies a kite, and the red time
// ball drops as the camera arrives. After dark a green laser marks the
// meridian across the river.

import { RGB, Rng, V2, V3, clamp, hex, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_MARK, L_RIPPLE, L_SPARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import { Look, W_FINE, W_THIN, bench, bulb, clock, dogOn, flag, flowerBed, globeLamp, hat, lamp, person, pigeon, railing, randomLook, riverBus, snapper, squirrel, steps, tree, tufts, unionJack, van, windowAt, windowGrid } from "../props";

/** Height of the land above the river (the paper is at z = 0 here). */
const G = 1.4;
/** The meridian is the line x = y + AXIS: it runs straight up the page, from the front of the islet to the river. */
const AXIS = 2;
/** A point on the meridian, by how far down the page it is. */
const mer = (s: number): V2 => [s + AXIS / 2, s - AXIS / 2];
/** One step across the meridian, towards the east (the right of the page). */
const EAST: V2 = [Math.SQRT1_2, -Math.SQRT1_2];

// The observatory's hill: a round mound with a flat top.
const HILL: V2 = [31, 26];
const HILL_R = 8.2;
const HILL_TOP = 6;
const HILL_H = 3;

/** Height of the ground above the lawn at a point: the lawn itself, the slope of the hill, or its top. */
function hillZ(x: number, y: number): number {
  return HILL_H * clamp((HILL_R - Math.hypot(x - HILL[0], y - HILL[1])) / (HILL_R - HILL_TOP), 0, 1);
}

const BRASS = hex("#d2a94e");
const COAT = hex("#c8975f");
const COAT_D = hex("#8f6a44");
const ICE = hex("#f7d6e0");
const LASER: RGB = [96, 255, 130];

// ---------------------------------------------------------------- the land

// The river bank from north to south: the land comes just far enough west to cover the water's edge.
const BANK: V2[] = [
  [13.6, -2.6],
  [12.6, 0],
  [11.3, 3.4],
  [10.3, 6],
  [8.7, 10],
  [6.9, 14],
  [5.0, 18],
  [2.8, 22],
  [0.2, 26],
  [-1.5, 28.2],
  [-2.3, 30.2],
];
// Round the front of the islet and back up its east side.
const COAST: V2[] = [
  [-1.4, 32.6],
  [1.5, 34.9],
  [6.5, 36.6],
  [13, 37.9],
  [20, 38.3],
  [27, 37.6],
  [33, 35.9],
  [37.2, 33],
  [39.5, 28.5],
  [40, 22.5],
  [38.8, 16],
  [36.4, 10],
  [32.8, 4.6],
  [28.2, 0.4],
  [22.5, -2.4],
  [17.5, -3.4],
];

/** Round a closed outline off by cutting its corners. */
function smoothLoop(pts: V2[], rounds: number): V2[] {
  let cur = pts;
  for (let r = 0; r < rounds; r++) {
    const next: V2[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    cur = next;
  }
  return cur;
}

const SHORE = smoothLoop([...BANK, ...COAST], 2);

function onLand(x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = SHORE.length - 1; i < SHORE.length; j = i++) {
    const [xi, yi] = SHORE[i];
    const [xj, yj] = SHORE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Where the land ends on the river side, at a given y. */
function bankX(y: number): number {
  for (let i = 0; i + 1 < BANK.length; i++) {
    const a = BANK[i];
    const b = BANK[i + 1];
    if (y <= b[1] || i === BANK.length - 2) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  }
  return BANK[0][0];
}

function oval(cx: number, cy: number, rx: number, ry: number, n: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

/** Distance from a point to a stretch of path. */
function nearSeg(x: number, y: number, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}

/** A path of even width through some points. */
function strip(g: Plane, pts: V2[], w: number, rgb: RGB): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = ((ay - by) / len) * (w / 2);
    const ny = ((bx - ax) / len) * (w / 2);
    g.poly(
      [
        [ax + nx, ay + ny],
        [bx + nx, by + ny],
        [bx - nx, by - ny],
        [ax - nx, ay - ny],
      ],
      rgb,
      { grain: 0.7 },
    );
    if (i > 0) g.circle(ax, ay, w / 2, rgb, { seg: 8, grain: 0.7 });
  }
}

// The gravel paths: along the meridian, from the ship to the observatory steps, and out to the ice cream van.
const WALK_AXIS: V2[] = [mer(8.9), mer(22.9)];
const PATH_HILL: V2[] = [
  [17.6, 30.3],
  [23, 31.5],
  [27, 34.4],
  [30.6, 35.3],
];
const PATH_VAN: V2[] = [
  [17.6, 15.4],
  [26.5, 14.9],
  [30.2, 13.5],
];
// Picnic rugs: x, y, width, depth, colour.
const RUGS: [number, number, number, number, RGB][] = [
  [19.4, 32.4, 2.4, 1.7, C.red],
  [33.6, 12.4, 2.2, 1.6, C.blue],
];

/** Is this spot open grass (nothing paved, planted or parked on it)? */
function lawn(x: number, y: number): boolean {
  for (const [dx, dy] of [
    [0.6, 0],
    [-0.6, 0],
    [0, 0.6],
    [0, -0.6],
  ]) {
    if (!onLand(x + dx, y + dy)) return false;
  }
  if (Math.hypot(x - HILL[0], y - HILL[1]) < HILL_R + 0.4) return false;
  if (y < 30.4 && x < bankX(y - 0.8) + 3.3) return false;
  if (x > 6.7 && x < 17 && y > 15.9 && y < 23.3) return false;
  if (x > 17.2 && x < 26.3 && y > 5.5 && y < 14.2) return false;
  if (((x - 9.6) / 8.5) ** 2 + ((y - 27.3) / 4.4) ** 2 < 1) return false;
  if (Math.hypot(x - 13.4, y - 8.8) < 2.1) return false;
  if (nearSeg(x, y, WALK_AXIS[0], WALK_AXIS[1]) < 1.0) return false;
  for (const p of [PATH_HILL, PATH_VAN]) for (let i = 0; i + 1 < p.length; i++) if (nearSeg(x, y, p[i], p[i + 1]) < 0.95) return false;
  for (const [rx, ry, rw, rd] of RUGS) if (x > rx - 0.3 && x < rx + rw + 0.3 && y > ry - 0.3 && y < ry + rd + 0.3) return false;
  // the ice cream van and its queue, and the deckchairs
  if (x > 28.2 && x < 34.4 && y > 7.2 && y < 13.4) return false;
  if (x > 31.2 && x < 36.4 && y > 14.9 && y < 17.5) return false;
  return true;
}

function ground(c: LondonCtx): void {
  const { pen } = c;
  pen.begin();
  pen.extrude(SHORE, 0, G, C.granite, { top: C.grass, crease: 30 });
  pen.end();
  pen.push(0, 0, G);
  const walk = pen.floor(0, 1);
  const paved = pen.floor(0, 2);
  const gravel = pen.floor(0, 3);
  const mark = pen.floor(0, 4);
  // the riverside walk, following the bank
  const outer: V2[] = [];
  const inner: V2[] = [];
  for (let y = 0.4; y <= 28.4; y += 2.325) {
    outer.push([bankX(y) + 0.25, y + 0.15]);
    inner.push([bankX(y) + 2.75, y + 1.55]);
  }
  walk.poly([...outer, ...inner.slice().reverse()], C.flag, { grain: 0.6 });
  mark.line(outer, { w: 0.07 });
  mark.line(inner, { w: 0.05, color: C.flagDark, kind: L_MARK });
  // paving round the two courts of the college, and round the ship
  paved.rect(7.0, 16.2, 16.7, 22.95, C.paving, { outline: true, w: 0.05, grain: 0.6 });
  paved.rect(17.5, 5.8, 26.0, 13.9, C.paving, { outline: true, w: 0.05, grain: 0.6 });
  paved.poly(oval(9.6, 27.3, 8.2, 4.1, 30), C.plaza, { outline: true, w: 0.05, grain: 0.6 });
  // gravel
  strip(gravel, WALK_AXIS, 1.5, C.gravel);
  strip(gravel, PATH_HILL, 1.3, C.gravel);
  strip(gravel, PATH_VAN, 1.2, C.gravel);
  // the hill, and the observatory's courtyard on top of it
  pen.begin();
  pen.cyl(HILL[0], HILL[1], 0, HILL_R, HILL_H, C.grass, { seg: 28, r2: HILL_TOP, top: C.grassLight });
  pen.floor(HILL_H, 1).circle(HILL[0], HILL[1], 5.55, C.flag, { seg: 26, outline: true, w: 0.05, grain: 0.6 });
  pen.end();
  tufts(walk, -2, -3, 40, 38.5, 0.22, lawn);
  pen.pop();
}

/** The brass strip of the meridian, laid over lawn, slope and courtyard alike; it stops only for the building it runs through. */
function meridian(pen: Pen): void {
  const at = (s: number): V3 => {
    const [x, y] = mer(s);
    return [x, y, hillZ(x, y) + 0.03];
  };
  const run = (s0: number, s1: number): V3[] => {
    const pts: V3[] = [];
    const n = Math.ceil((s1 - s0) / 0.3);
    for (let i = 0; i <= n; i++) pts.push(at(s0 + ((s1 - s0) * i) / n));
    return pts;
  };
  pen.obj(() => {
    const brass = { w: 0.16, color: BRASS, kind: L_MARK, wobble: 0, layer: 5 };
    pen.stroke(run(8.75, 25.38), brass);
    pen.stroke(run(27.42, 34.75), brass);
  });
  // which side is which, lettered on the courtyard
  pen.obj(() => {
    for (const [letter, side] of [
      ["W", -1],
      ["E", 1],
    ] as const) {
      const [x, y] = mer(31.45);
      const p = pen.plane([x + EAST[0] * side * 0.95, y + EAST[1] * side * 0.95 + 0.3, HILL_H + 0.02], [1, 0, 0], [0, -1, 0], 3, true);
      p.text(letter, 0, 0, 0.6, { align: "c", color: C.inkSoft, kind: L_MARK, w: 0.09, wobble: 0.3 });
    }
  }, 0.2);
}

// ---------------------------------------------------------------- the riverside

/** The way down to the foot tunnel under the river: a brick drum under a glass dome. */
function rotunda(c: LondonCtx, x: number, y: number): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.cyl(x, y, 0, 1.45, 2.3, C.brick, { seg: 14, w: 0.1, top: C.stone });
    pen.cyl(x, y, 2.3, 1.56, 0.24, C.portland, { seg: 14, w: W_THIN });
    pen.dome(x, y, 2.54, 1.42, 1.3, C.glassPale, { seg: 14, rings: 3, glow: 0.6, grain: 0.3, w: W_THIN });
    // glazing bars
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (Math.cos(a) + Math.sin(a) < -0.3) continue;
      const rib: V3[] = [];
      for (let q = 0; q <= 5; q++) {
        const ph = (q / 5) * Math.PI * 0.5;
        rib.push([x + Math.cos(a) * Math.cos(ph) * 1.43, y + Math.sin(a) * Math.cos(ph) * 1.43, 2.54 + Math.sin(ph) * 1.31]);
      }
      pen.stroke(rib, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0 });
    }
    pen.cyl(x, y, 3.8, 0.3, 0.36, C.portland, { seg: 6, w: W_FINE });
    pen.cone(x, y, 4.16, 0.4, 0.5, C.lead, { seg: 6, w: W_FINE });
    // the doorway, on the side the camera sees
    const k = pen.card(x + 1.03, y + 1.03, 0);
    const door: V2[] = [
      [-0.5, 0],
      [0.5, 0],
      [0.5, 1.3],
    ];
    for (let q = 1; q < 6; q++) door.push([Math.cos((q / 6) * Math.PI) * 0.5, 1.3 + Math.sin((q / 6) * Math.PI) * 0.5]);
    door.push([-0.5, 1.3]);
    k.poly(
      door.map((p) => [p[0] * 1.22, p[1] * 1.1] as V2),
      C.portland,
      { outline: true, w: W_FINE, grain: 0.4 },
    );
    k.poly(door, hex("#4b4038"), { layer: 1, grain: 0.6, glow: 0.35 });
    k.text("TUNNEL", 0, 2.02, 0.2, { align: "c", color: C.white, kind: L_MARK, w: 0.045, wobble: 0.2, layer: 2 });
  });
  // somebody wheeling a bike in (no cycling down there), somebody coming out
  person(pen, x + 2.0, y + 1.5, 0, randomLook(rng), "walkA", true);
  person(pen, x + 0.6, y + 2.3, 0, randomLook(rng), "stand");
}

function riverside(c: LondonCtx): void {
  const { pen, rng } = c;
  const rail = (y0: number, y1: number) => {
    const pts: V3[] = [];
    const n = Math.ceil((y1 - y0) / 2);
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      pts.push([bankX(y) + 0.5, y + 0.3, 0]);
    }
    railing(pen, pts, 0.85, C.iron, 1.2);
  };
  // railings along the water, with a gap where the gangway goes down to the pier
  rail(0.6, PIER[1] - 1.1);
  rail(PIER[1] + 1.3, 29);
  for (const y of [2.2, 10.9, 16.2, 21.6]) globeLamp(pen, bankX(y) + 1.05, y + 0.7, 0, 3.1);
  rotunda(c, 13.4, 8.8);
  // where the meridian meets the river: a telescope trained on the flood barrier, and a queue for it
  telescope(pen, 9.8, 9.9);
  person(pen, 10.45, 9.3, 0, randomLook(rng), "stand", true);
  person(pen, 11.15, 9.75, 0, randomLook(rng), "stand", true, 0.72);
  person(pen, 10.25, 7.75, 0, randomLook(rng), "wave");
  // people at the rail, watching the river go by
  for (const y of [1.2, 3.3, 4.6, 12.6, 13.4, 19.6, 20.4, 23.0]) {
    person(pen, bankX(y) + 0.95, y + 0.55, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  // a bench by the tunnel, and a flag at the northern tip
  bench(pen, 12.2, 5.4, 120);
  person(pen, 12.0, 5.3, 0.42, randomLook(rng), "sit", true);
  person(pen, 12.5, 5.7, 0.42, randomLook(rng), "sit");
  flag(pen, 15.4, -0.9, 0, 6.2, "uk", 1.1);
  tree(pen, rng, 18.6, -1.2, { kind: "round" });
  tree(pen, rng, 21.6, 2.6, { kind: "elm" });
  tree(pen, rng, 15.8, 3.2, { kind: "round" });
}

/** A telescope on a post, for looking at the flood barrier through. */
function telescope(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.pole([x, y, 0], [x, y, 1.15], 0.13, C.iron);
    const k = pen.card(x, y, 1.15);
    k.bar(-0.36, 0.06, 0.34, 0.3, 0.24, C.metal, { layer: 1 });
    k.circle(0.36, 0.31, 0.13, C.glass, { layer: 2, seg: 7, grain: 0 });
  });
}

/** Where the pier leaves the riverside walk: under the ship's bowsprit, well clear of the flood barrier down river. */
const PIER: V2 = [0.75, 25.6];

/** The pier: a gangway down to a floating landing stage, and a river bus alongside. */
function pier(c: LondonCtx): void {
  const { pen, rng } = c;
  // in this frame +x runs out from the bank over the water and +y is down river
  pen.push(PIER[0], PIER[1], 0, 213);
  const W = -G;
  pen.obj(() => {
    pen.fill(
      [
        [-0.2, -0.6, -0.02],
        [1.35, -0.6, W + 0.58],
        [1.35, 0.6, W + 0.58],
        [-0.2, 0.6, -0.02],
      ],
      C.metal,
      { outline: true, w: W_THIN, grain: 0.5 },
    );
    for (const y of [-0.6, 0.6]) {
      pen.stroke(
        [
          [-0.2, y, 0.78],
          [1.35, y, W + 1.3],
        ],
        { w: 0.07, color: C.white, kind: L_BAR, wobble: 0 },
      );
      pen.pole([-0.2, y, 0], [-0.2, y, 0.8], 0.09, C.white);
    }
    // the landing stage, which floats
    pen.box(1.25, -4.2, W - 0.05, 2.0, 8.4, 0.6, C.slateLight, { top: C.portland, w: 0.1 });
    pen.floor(W + 0.55, 1).loop(
      [
        [1.45, -4.0],
        [3.05, -4.0],
        [3.05, 4.0],
        [1.45, 4.0],
      ],
      { w: 0.08, color: C.yellow, kind: L_MARK, wobble: 0.2 },
    );
    for (const y of [-3.6, 3.6]) pen.pole([3.05, y, W + 0.55], [3.05, y, W + 1.0], 0.2, C.iron);
  });
  // the name on a board at the top of the gangway, and a lifebelt on the stage
  pen.obj(() => {
    pen.pole([-0.7, 1.4, 0], [-0.7, 1.4, 2.5], 0.1, C.iron);
    const k = pen.card(-0.7, 1.4, 2.5);
    k.rect(-0.9, -0.1, 0.9, 0.6, C.navy, { outline: true, w: W_FINE, grain: 0.2 });
    k.text("PIER", 0, 0.06, 0.36, { align: "c", color: C.white, kind: L_MARK, w: 0.07, wobble: 0.2, layer: 1 });
    pen.pole([2.2, 3.5, W + 0.55], [2.2, 3.5, W + 1.6], 0.09, C.white);
    pen.card(2.2, 3.5, W + 1.6).circle(0, 0.22, 0.24, null, { ink: C.orange, w: 0.11, seg: 9 });
  }, 0.15);
  globeLamp(pen, 2.25, 1.0, W + 0.55, 2.6);
  // people waiting for the boat, and the mate in a yellow jacket
  for (const [x, y] of [
    [2.2, -2.9],
    [2.65, -1.9],
    [2.1, -0.4],
    [2.55, 2.0],
    [2.05, 2.8],
  ]) {
    person(pen, x, y, W + 0.55, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  person(pen, 2.95, 0.45, W + 0.55, { ...randomLook(rng), top: C.hivis, hat: null }, "wave", true);
  // the river bus, tied up alongside
  pen.push(4.9, 0, W, 90);
  riverBus(pen, rng, false);
  pen.pop();
  pen.obj(() => {
    for (const y of [-3.6, 3.6]) {
      pen.stroke(
        [
          [3.05, y, W + 0.95],
          [3.6, y * 1.06, W + 0.62],
        ],
        { w: 0.045, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.3);
  pen.pop();
}

// ---------------------------------------------------------------- the old naval college

/**
 * One of the college's two courts. They mirror each other across the
 * meridian: each has its dome at the corner nearest the line and a colonnade
 * along the side that faces it.
 */
function court(pen: Pen, rng: Rng, x0: number, y0: number, mirror: boolean): void {
  const w = 7;
  const d = 5.5;
  const H = 5.2;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, H, C.portland, { top: C.portlandDark });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, x0, y0, 0, w, d);
      const len = side === "y+" ? w : d;
      const cols = side === "y+" ? 5 : 4;
      f.rect(0, 0, len, 1.9, C.portlandDark, { grain: 0.7 });
      f.seg(0, 1.9, len, 1.9, { w: W_FINE });
      windowGrid(f, rng, 0.35, 0.3, len - 0.35, 1.8, cols, 1, { lit: 0.7, arched: true, trim: C.portlandLight, fillA: 0.5, fillB: 0.86 });
      windowGrid(f, rng, 0.35, 2.15, len - 0.35, H - 0.5, cols, 2, { lit: 0.6, trim: C.portlandLight, fillA: 0.5, fillB: 0.66 });
      f.rect(0, H - 0.38, len, H, C.portlandLight, { grain: 0.4, layer: 1 });
      f.seg(0, H - 0.38, len, H - 0.38, { w: W_FINE, layer: 1 });
    }
  });
  pen.obj(() => pen.hip(x0 + 0.35, y0 + 0.35, H, w - 0.7, d - 0.7, 1.0, C.lead), 0.1);
  // the colonnade
  pen.obj(() => {
    if (mirror) {
      for (let k = 0; k < 7; k++) pen.cyl(x0 + 0.45 + (k * (w - 0.9)) / 6, y0 + d + 1.05, 0, 0.19, 2.3, C.portlandLight, { seg: 6, w: W_FINE });
      pen.box(x0, y0 + d, 2.3, w, 1.35, 0.38, C.portlandLight, { w: W_THIN, top: C.portlandDark });
    } else {
      for (let k = 0; k < 6; k++) pen.cyl(x0 + w + 1.05, y0 + 0.45 + (k * (d - 0.9)) / 5, 0, 0.19, 2.3, C.portlandLight, { seg: 6, w: W_FINE });
      pen.box(x0 + w, y0, 2.3, 1.35, d, 0.38, C.portlandLight, { w: W_THIN, top: C.portlandDark });
    }
  }, 0.15);
  // the tower at the inner corner, and its dome
  const tx = mirror ? x0 : x0 + w - 2.3;
  const ty = mirror ? y0 + d - 2.3 : y0;
  const cx = tx + 1.15;
  const cy = ty + 1.15;
  pen.obj(() => {
    pen.box(tx, ty, H, 2.3, 2.3, 1.4, C.portland, { top: C.portlandDark });
    pen.cyl(cx, cy, H + 1.4, 0.98, 1.5, C.portlandLight, { seg: 12, top: C.portlandDark, w: W_THIN });
    // tall windows between the columns of the drum
    for (let k = 0; k < 12; k++) {
      const a = ((k + 0.5) / 12) * Math.PI * 2;
      if (Math.cos(a) + Math.sin(a) < 0.1) continue;
      pen.stroke(
        [
          [cx + Math.cos(a) * 1.0, cy + Math.sin(a) * 1.0, H + 1.65],
          [cx + Math.cos(a) * 1.0, cy + Math.sin(a) * 1.0, H + 2.65],
        ],
        { w: 0.2, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.cyl(cx, cy, H + 2.9, 1.12, 0.16, C.portlandLight, { seg: 12, w: W_FINE });
  }, 0.25);
  pen.obj(() => {
    pen.dome(cx, cy, H + 3.06, 1.1, 1.3, C.lead, { seg: 12, rings: 4, w: W_THIN });
    pen.cyl(cx, cy, H + 4.28, 0.26, 0.5, C.lamp, { seg: 6, w: W_FINE, glow: 1, top: C.lead });
    pen.cone(cx, cy, H + 4.78, 0.34, 0.5, C.lead, { seg: 6, w: W_FINE });
    pen.card(cx, cy, H + 5.28).circle(0, 0.1, 0.11, C.gold, { seg: 6, grain: 0.2, outline: true, w: 0.03 });
  }, 0.4);
}

function college(c: LondonCtx): void {
  const { pen, rng } = c;
  court(pen, rng, 7.75, 17, false);
  court(pen, rng, 18.25, 6.5, true);
  // students under the colonnades, a gowned procession crossing between the courts
  person(pen, 15.8, 19.4, 0, randomLook(rng), "stand", true);
  person(pen, 15.9, 21.3, 0, randomLook(rng), "wave");
  person(pen, 20.2, 13.1, 0, randomLook(rng), "stand");
  person(pen, 22.6, 13.0, 0, randomLook(rng), "stand", true);
  for (let k = 0; k < 4; k++) {
    const lk: Look = { skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: C.black, legs: C.black, long: rng.chance(0.5), hat: null };
    const x = 16.6 + k * 0.62;
    const y = 16.4 - k * 0.62;
    pen.obj(() => {
      person(pen, x, y, 0, lk, k % 2 === 0 ? "walkA" : "walkB", true);
      // a mortar board
      const q = pen.card(x, y, 0, true);
      q.poly(
        [
          [-0.52, 2.26],
          [0, 2.12],
          [0.52, 2.26],
          [0, 2.42],
        ],
        C.black,
        { outline: true, w: W_FINE, layer: 6, grain: 0.3 },
      );
    });
  }
  lamp(pen, 17.2, 23.0);
  lamp(pen, 26.4, 13.6);
}

// ---------------------------------------------------------------- the Cutty Sark

// The clipper's deck, seen from above: sharp at the bow (+x), rounded at the stern.
const HULL: V2[] = [
  [-5.75, -0.5],
  [-5.35, -0.98],
  [-4.3, -1.22],
  [-1, -1.25],
  [2.2, -1.1],
  [4.3, -0.68],
  [5.75, 0],
  [4.3, 0.68],
  [2.2, 1.1],
  [-1, 1.25],
  [-4.3, 1.22],
  [-5.35, 0.98],
  [-5.75, 0.5],
];
/** Where each mast stands along her length, and how tall it is above the deck. */
const MASTS: [number, number][] = [
  [2.9, 9.2],
  [0.1, 10.4],
  [-3.0, 8.0],
];
const DECK = 2.6;

function cuttySark(c: LondonCtx): void {
  const { pen, rng } = c;
  // her bow points at the river
  pen.push(9.2, 27.2, 0, 180);
  const swell = (k: number): V2[] => HULL.map((p) => [p[0] * (1 + k / 5.75), p[1] * (1 + k / 1.25)] as V2);
  // the glass skirt round her waterline: you walk about underneath her
  pen.obj(() => {
    pen.extrude(oval(-0.4, 0, 7.0, 2.9, 30), 0, 0.9, C.glassPale, { top: C.glassLight, crease: 30, glow: 0.45, grain: 0.4, w: 0.09 });
    const g = pen.floor(0.9, 1);
    for (let i = 0; i < 30; i++) {
      const t = ((i + 0.5) / 30) * Math.PI * 2;
      g.seg(-0.4 + Math.cos(t) * 7.0, Math.sin(t) * 2.9, Math.cos(t) * 5.8, Math.sin(t) * 1.4, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0 });
    }
    g.line([...oval(-0.2, 0, 6.5, 2.2, 30), [6.3, 0]], { w: 0.05, color: C.white, kind: L_MARK, wobble: 0 });
  });
  // the hull: black, yellow metal below the waterline, a gold line under the rail
  pen.obj(() => {
    pen.extrude(HULL, 0.5, DECK, C.black, { top: C.wood, crease: 28, w: 0.11 });
    pen.extrude(swell(0.03), 0.5, 1.02, BRASS, { crease: 28, w: W_FINE });
    pen.extrude(swell(0.035), 2.2, 2.33, C.gold, { crease: 28, edges: false });
    pen.box(0.9, -0.5, DECK, 1.5, 1.0, 0.75, C.white, { top: C.woodDark, w: W_THIN });
    pen.box(-2.4, -0.5, DECK, 1.3, 1.0, 0.75, C.white, { top: C.woodDark, w: W_THIN });
    pen.box(-0.65, -0.45, DECK, 0.9, 0.9, 0.24, C.woodDark, { w: W_FINE });
    pen.card(-4.85, 0, DECK).circle(0, 0.42, 0.3, null, { ink: C.woodDark, w: 0.08, seg: 9 });
    // the figurehead, in white, reaching out under the bowsprit
    const k = pen.card(5.95, 0, 2.05);
    k.poly(
      [
        [-0.16, 0],
        [0.16, 0.04],
        [0.2, 0.46],
        [-0.12, 0.44],
      ],
      C.white,
      { outline: true, w: 0.035, grain: 0.2 },
    );
    k.circle(0.06, 0.6, 0.13, C.white, { outline: true, w: 0.035, seg: 7, layer: 1, grain: 0.2 });
  }, 0.1);
  // three masts, their yards with the sails furled along them, and the rigging
  pen.obj(() => {
    pen.pole([5.3, 0, 2.75], [8.3, 0, 3.7], 0.14, C.wood);
    for (const [x, h] of MASTS) {
      pen.pole([x, 0, DECK], [x, 0, DECK + h], 0.16, C.wood);
      pen.pole([x, 0, DECK], [x, 0, DECK + h * 0.34], 0.2, C.white, { bias: 0.02 });
      const k = h / 10.4;
      for (const [f, half] of [
        [0.3, 2.5],
        [0.56, 2.0],
        [0.78, 1.5],
      ]) {
        const z = DECK + h * f;
        pen.pole([x, -half * k, z], [x, half * k, z], 0.1, C.woodDark);
        pen.pole([x, -half * k * 0.92, z + 0.14], [x, half * k * 0.92, z + 0.14], 0.2, C.white, { bias: 0.02 });
      }
      // shrouds, down to the rail on both sides
      for (const s of [-1, 1]) {
        for (const dx of [-0.9, -0.35, 0.2]) {
          pen.stroke(
            [
              [x, 0, DECK + h * 0.62],
              [x + dx, s * 1.2, DECK + 0.05],
            ],
            { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 },
          );
        }
      }
    }
    // stays, mast to mast and out to the bowsprit
    const stay = (a: V3, b: V3) => pen.stroke([a, b], { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
    stay([2.9, 0, DECK + 9.2 * 0.62], [8.2, 0, 3.66]);
    stay([0.1, 0, DECK + 10.4 * 0.62], [2.9, 0, DECK + 2.2]);
    stay([-3.0, 0, DECK + 8.0 * 0.62], [0.1, 0, DECK + 2.4]);
  }, 0.3);
  // dressed overall: a line of signal flags from the bowsprit over the mastheads to the stern, with a bulb here and there
  const dress: V3[] = [
    [8.3, 0, 3.7],
    [2.9, 0, DECK + 9.2],
    [0.1, 0, DECK + 10.4],
    [-3.0, 0, DECK + 8.0],
    [-5.7, 0, 3.3],
  ];
  pen.obj(() => {
    pen.stroke(dress, { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 });
    const cols = [C.red, C.yellow, C.blue, C.white, C.green, C.orange];
    let n = 0;
    for (let i = 0; i + 1 < dress.length; i++) {
      const a = dress[i];
      const b = dress[i + 1];
      const m = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.8));
      for (let q = 1; q < m; q++) {
        const t = q / m;
        const x = a[0] + (b[0] - a[0]) * t;
        const z = a[2] + (b[2] - a[2]) * t;
        pen.card(x, 0, z).rect(-0.17, -0.36, 0.17, -0.05, cols[n % cols.length], { outline: true, w: 0.03, sway: 0.1, grain: 0.3 });
        if (n % 3 === 1) bulb(pen, x, 0, z + 0.02, 0.15);
        n++;
      }
    }
  }, 0.5);
  // the red ensign at her stern
  pen.obj(() => {
    pen.pole([-5.5, 0, DECK], [-5.5, 0, DECK + 2.1], 0.08, C.white);
    const k = pen.card(-5.5, 0, DECK + 1.25);
    k.rect(0.04, 0, 1.24, 0.78, C.red, { outline: true, w: W_FINE, sway: 0.4, grain: 0.4, layer: 1 });
    unionJack(k, 0.04, 0.4, 0.58, 0.38, { sway: 0.4, layer: 2, fine: false, outline: false });
  }, 0.5);
  // visitors on deck, and a guide in a peaked cap
  for (const [x, y, pose] of [
    [3.9, 0.3, "stand"],
    [1.6, 0.85, "wave"],
    [-1.2, -0.75, "stand"],
    [-3.9, 0.5, "stand"],
  ] as const) {
    person(pen, x, y, DECK, randomLook(rng), pose, rng.chance(0.5), rng.chance(0.25) ? 0.72 : 1);
  }
  const guide: Look = { skin: SKIN[1], hair: HAIR[7], top: C.navy, legs: C.navy, long: false, hat: null };
  person(pen, 4.7, -0.1, DECK, guide, "wave", true);
  hat(pen, 4.7, -0.1, DECK, "cap", { pose: "wave", flip: true });
  pen.pop();

  // the ticket booth and its queue, and the name on a board
  pen.obj(() => {
    pen.box(15.2, 29.6, 0, 1.5, 1.2, 2.1, C.navy, { top: C.white, w: W_THIN });
    const f = pen.wall("y+", 15.2, 29.6, 0, 1.5, 1.2);
    f.rect(0.2, 0.95, 1.3, 1.7, C.lamp, { outline: true, w: W_FINE, glow: 1, grain: 0.2 });
    f.circle(0.75, 1.3, 0.17, SKIN[2], { layer: 1, seg: 7, grain: 0 });
  });
  for (let k = 0; k < 5; k++) {
    person(pen, 17.2 + k * 0.78, 30.55 + (k % 2) * 0.22, 0, randomLook(rng), k === 3 ? "wave" : "stand", k % 2 === 0, k === 2 ? 0.72 : 1);
  }
  pen.obj(() => {
    for (const x of [8.9, 12.7]) pen.pole([x, 31.05, 0], [x, 31.05, 1.75], 0.09, C.iron);
    const sg = pen.plane([8.8, 31.07, 0.95], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 4.0, 0.82, C.navy, { outline: true, w: W_FINE, grain: 0.3 });
    sg.text("CUTTY SARK", 2.0, 0.22, 0.38, { align: "c", color: C.gold, kind: L_MARK, w: 0.065, wobble: 0.3, layer: 1 });
  });
  // a painter at an easel, getting the rigging wrong
  pen.obj(() => {
    const k = pen.card(14.3, 32.6, 0);
    k.bar(-0.38, 0, -0.1, 1.5, 0.06, C.woodDark);
    k.bar(0.38, 0, 0.1, 1.5, 0.06, C.woodDark);
    k.rect(-0.42, 0.75, 0.42, 1.4, C.white, { outline: true, w: W_FINE, layer: 1, grain: 0.2 });
    k.seg(-0.28, 0.9, 0.24, 0.9, { w: 0.07, wobble: 0.3, layer: 2 });
    for (const a of [-0.16, 0.0, 0.14]) k.seg(a, 0.9, a, 1.28, { w: 0.035, wobble: 0.2, layer: 2 });
    const artist = { ...randomLook(rng), top: C.teal };
    person(pen, 13.4, 32.9, 0, artist, "wave");
    hat(pen, 13.4, 32.9, 0, "cap", { pose: "wave", color: C.redDark });
  });
  // a bench with a view of her
  bench(pen, 6.2, 32.0, 180);
  person(pen, 5.8, 31.9, 0.42, randomLook(rng), "sit");
  person(pen, 6.7, 31.9, 0.42, randomLook(rng), "sit", true);
  person(pen, 3.4, 30.6, 0, randomLook(rng), "stand", true);
  snapper(pen, 4.6, 31.4, randomLook(rng), true);
  lamp(pen, 2.6, 33.0);
  lamp(pen, 17.9, 26.0);
}

// ---------------------------------------------------------------- the observatory

/** Call `draw` with a plane on each face of an upright prism that the camera can see. */
function facets(pen: Pen, cx: number, cy: number, z: number, r: number, n: number, draw: (f: Plane, len: number) => void): void {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    const ax = Math.cos(a0) * r;
    const ay = Math.sin(a0) * r;
    const bx = Math.cos(a1) * r;
    const by = Math.sin(a1) * r;
    const len = Math.hypot(bx - ax, by - ay);
    const f = pen.plane([cx + ax, cy + ay, z], [(bx - ax) / len, (by - ay) / len, 0], [0, 0, 1], 1);
    if (f.visible) draw(f, len);
  }
}

// Flamsteed House: where it stands on the hilltop, and where the time ball's mast is on its roof.
const HOUSE = { x: 30.9, y: 22.8, w: 4, d: 3, h: 3.2 };
const MAST: V2 = [34.35, 23.35];
const MAST_Z = HILL_H + HOUSE.h + 0.85;
/** The little building the line runs through: where the laser comes from. */
const TRANSIT = { x: 26.4, y: 24.4, w: 2, d: 2, h: 2 };

function observatory(c: LondonCtx): void {
  const { pen, rng } = c;
  // the steps up from the park
  steps(pen, 29.6, 31.75, 0, 2.0, 2.6, HILL_H, 8, C.portland);
  pen.push(0, 0, HILL_H);
  const { x, y, w, d, h } = HOUSE;
  // Flamsteed House: red brick dressed with white stone
  pen.obj(() => {
    pen.box(x, y, 0, w, d, h, C.brick, { top: C.lead });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, x, y, 0, w, d);
      const len = side === "y+" ? w : d;
      for (const a of [0, len - 0.26]) f.rect(a, 0, a + 0.26, h, C.white, { grain: 0.3 });
      f.rect(0, h - 0.3, len, h, C.white, { grain: 0.3, layer: 1 });
      f.seg(0, h - 0.3, len, h - 0.3, { w: W_FINE, layer: 1 });
      if (side === "y+") {
        windowGrid(f, rng, 0.4, 1.75, len - 0.4, h - 0.4, 4, 1, { lit: 0.8, trim: C.white, fillA: 0.56, fillB: 0.8 });
        windowAt(f, 0.5, 0.45, 1.1, 1.45, true, C.white);
        f.rect(1.55, 0, 2.3, 1.55, C.door, { outline: true, w: W_THIN, layer: 1 });
        // the gate clock: twenty-four hours on one dial, and it is one o'clock
        clock(f, 3.2, 0.98, 0.46, 1, 0);
      } else {
        windowGrid(f, rng, 0.4, 0.45, len - 0.4, h - 0.4, 2, 2, { lit: 0.8, trim: C.white, fillA: 0.52, fillB: 0.7 });
      }
    }
  });
  // the Octagon Room on top, all tall windows, with a balustrade round the roof
  pen.obj(() => {
    const ox = x + w / 2;
    const oy = y + d / 2;
    pen.cyl(ox, oy, h, 1.4, 1.9, C.brick, { seg: 8, top: C.lead, w: 0.1, crease: 20 });
    facets(pen, ox, oy, h, 1.4, 8, (f, len) => {
      f.rect(0, 0, 0.12, 1.9, C.white, { grain: 0.3 });
      windowAt(f, 0.26, 0.3, len - 0.14, 1.5, true, C.white);
    });
    pen.cyl(ox, oy, h + 1.9, 1.52, 0.16, C.white, { seg: 8, w: W_FINE, crease: 20 });
  }, 0.2);
  // the turret that carries the time ball's mast, and a weather vane on top of that
  pen.obj(() => {
    const [mx, my] = MAST;
    pen.box(mx - 0.38, my - 0.38, h, 0.76, 0.76, 0.7, C.white, { w: W_FINE });
    pen.pyramid(mx - 0.44, my - 0.44, h + 0.7, 0.88, 0.88, 0.3, C.lead, { w: W_FINE });
    pen.pole([mx, my, h + 0.85], [mx, my, h + 4.0], 0.09, C.iron);
    const k = pen.card(mx, my, h + 4.0);
    k.seg(-0.42, 0, 0.42, 0, { w: 0.06, color: C.iron, kind: L_BAR, wobble: 0 });
    k.poly(
      [
        [0.42, 0.12],
        [0.7, 0],
        [0.42, -0.12],
      ],
      C.gold,
      { outline: true, w: 0.03, grain: 0.2 },
    );
    k.circle(0, 0.2, 0.1, C.red, { glow: 1, kind: F_NEON, seg: 6, grain: 0 });
  }, 0.35);
  // the transit house, which the line runs right through: the slit in its roof is where the telescope looked out
  pen.obj(() => {
    const t = TRANSIT;
    pen.box(t.x, t.y, 0, t.w, t.d, t.h, C.brickRose, { top: C.lead });
    const f = pen.wall("y+", t.x, t.y, 0, t.w, t.d);
    f.rect(0.5, 0, 1.3, 1.5, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    f.rect(0.62, 0, 1.18, 1.38, C.doorBlue, { layer: 1, grain: 0.4 });
    const g = pen.wall("x+", t.x, t.y, 0, t.w, t.d);
    windowAt(g, 0.6, 0.6, 1.4, 1.5, true, C.white);
    const roof = pen.floor(t.h, 1);
    roof.poly(
      [
        [t.x + 0.1, t.y + 0.26],
        [t.x + 0.26, t.y + 0.1],
        [t.x + t.w - 0.1, t.y + t.d - 0.26],
        [t.x + t.w - 0.26, t.y + t.d - 0.1],
      ],
      C.charcoal,
      { grain: 0.4 },
    );
    pen.card(t.x + t.w / 2, t.y + t.d / 2, t.h).circle(0, 0.2, 0.14, [120, 230, 140], { glow: 1, kind: F_NEON, seg: 6, grain: 0, outline: true, w: 0.03 });
  }, 0.1);
  // the great telescope's dome, like an onion
  pen.obj(() => {
    const tx = 26.3;
    const ty = 28.6;
    pen.cyl(tx, ty, 0, 1.2, 2.3, C.brick, { seg: 8, top: C.lead, w: 0.1, crease: 20 });
    facets(pen, tx, ty, 0, 1.2, 8, (f, len) => windowAt(f, 0.26, 0.9, len - 0.26, 1.8, rng.chance(0.6), C.white, false));
    pen.cyl(tx, ty, 2.3, 1.36, 0.2, C.white, { seg: 12, w: W_FINE });
    pen.dome(tx, ty, 2.5, 1.42, 1.7, C.portlandLight, { seg: 12, rings: 4, w: W_THIN });
    // the shutter the telescope looks out of
    const slit: V3[] = [];
    for (let q = 0; q <= 6; q++) {
      const ph = 0.15 + (q / 6) * 1.35;
      slit.push([tx + Math.cos(0.9) * Math.cos(ph) * 1.44, ty + Math.sin(0.9) * Math.cos(ph) * 1.44, 2.5 + Math.sin(ph) * 1.72]);
    }
    pen.stroke(slit, { w: 0.2, color: C.charcoal, kind: L_MARK, wobble: 0 });
  }, 0.25);
  // General Wolfe on his plinth, looking down the park to the river
  pen.obj(() => {
    pen.box(34.5, 29.0, 0, 0.9, 0.9, 1.5, C.portland, { w: W_THIN, top: C.portlandLight });
    const bronze: Look = { skin: C.bronze, hair: C.bronze, top: C.bronze, legs: C.bronze, long: false, hat: C.bronze };
    person(pen, 34.95, 29.45, 1.5, bronze, "stand", true);
    const k = pen.card(34.95, 29.45, 1.5, true);
    k.poly(
      [
        [-0.56, 2.16],
        [0.56, 2.16],
        [0, 2.5],
      ],
      C.bronze,
      { outline: true, w: W_FINE, layer: 6, grain: 0.3 },
    );
  }, 0.2);
  // a rail round the edge of the hilltop, open where the steps come up
  const rim = (a0: number, a1: number) => {
    const pts: V3[] = [];
    const n = Math.ceil((a1 - a0) / 14);
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      pts.push([HILL[0] + Math.cos(a) * 5.82, HILL[1] + Math.sin(a) * 5.82, 0]);
    }
    railing(pen, pts, 0.8, C.iron, 1.15);
  };
  rim(-52, 81);
  rim(107, 138);
  lamp(pen, 29.2, 30.6, 0, 3.0);
  lamp(pen, 35.6, 26.9, 0, 3.0);

  // ---- on the line
  // one foot in each hemisphere, and somebody to take the picture
  const [ax, ay] = mer(29.75);
  person(pen, ax, ay, 0, randomLook(rng), "cheer");
  const [bx, by] = mer(30.55);
  person(pen, bx + 0.1, by - 0.1, 0, randomLook(rng), "wave", true, 0.72);
  snapper(pen, 30.1, 30.3, randomLook(rng), false);
  // waiting their turn
  for (const [qx, qy, s] of [
    [33.2, 27.9, 1],
    [33.9, 27.5, 1],
    [34.5, 27.9, 0.72],
    [34.2, 28.4, 1],
  ]) {
    person(pen, qx, qy, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), true, s);
  }
  // a class in yellow jackets, half of it in each hemisphere, and the teacher on the line explaining
  const teacher = { ...randomLook(rng), top: C.purple };
  const [tx, ty] = mer(27.62);
  person(pen, tx, ty, 0, teacher, "wave");
  for (const side of [-1, 1]) {
    for (const s of [27.75, 28.4, 29.05]) {
      const [kx, ky] = mer(s);
      const lk = { ...randomLook(rng), top: C.hivis, hat: null };
      person(pen, kx + EAST[0] * side * 0.85, ky + EAST[1] * side * 0.85, 0, lk, rng.pick(["stand", "stand", "cheer"]), side < 0, 0.7);
    }
  }
  // a family at the door of the house, somebody reading the clock
  person(pen, 32.9, 26.4, 0, randomLook(rng), "stand");
  person(pen, 32.2, 26.6, 0, randomLook(rng), "stand", true, 0.72);
  person(pen, 34.3, 26.3, 0, randomLook(rng), "stand", true);
  pen.pop();
  // on the way up
  person(pen, 30.2, 33.6, 0.9, randomLook(rng), "walkA", true);
  person(pen, 31.0, 32.7, 1.9, randomLook(rng), "walkB", true, 0.72);
}

// ---------------------------------------------------------------- the park

/** Where the kite's owner stands. */
const KITE_FLYER: V2 = [37.5, 19.2];

/** A fallow deer on a card, nose towards +a: head up and watching, or down and grazing. */
function deerOn(k: Plane, up: boolean, stag: boolean): void {
  for (const a of [-0.42, -0.28, 0.26, 0.4]) k.bar(a, 0.66, a + (a < 0 ? -0.03 : 0.03), 0.03, 0.08, COAT_D);
  k.ellipse(0, 0.82, 0.56, 0.27, COAT, { outline: true, w: 0.04, seg: 10, grain: 0.3, layer: 1 });
  for (const [a, b] of [
    [-0.24, 0.9],
    [-0.02, 0.95],
    [0.2, 0.88],
    [-0.08, 0.78],
    [0.12, 0.76],
  ]) {
    k.circle(a, b, 0.045, C.white, { layer: 2, seg: 5, grain: 0 });
  }
  k.poly(
    [
      [-0.5, 0.92],
      [-0.7, 0.8],
      [-0.5, 0.74],
    ],
    C.white,
    { layer: 2, grain: 0, outline: true, w: 0.03 },
  );
  const hx = up ? 0.74 : 0.9;
  const hy = up ? 1.56 : 0.24;
  k.bar(0.42, 0.9, up ? 0.62 : 0.78, up ? 1.42 : 0.36, 0.17, COAT, { layer: 2 });
  k.ellipse(hx, hy, 0.2, 0.13, COAT, { outline: true, w: 0.04, seg: 8, grain: 0.3, layer: 3 });
  k.circle(hx + 0.17, hy - 0.02, 0.04, C.black, { layer: 4, seg: 5, grain: 0 });
  k.poly(
    [
      [hx - 0.14, hy + 0.1],
      [hx - 0.26, hy + 0.3],
      [hx - 0.02, hy + 0.14],
    ],
    COAT,
    { outline: true, w: 0.03, layer: 4, grain: 0.3 },
  );
  if (stag) {
    for (const s of [-1, 1]) {
      k.line(
        [
          [hx - 0.04, hy + 0.12],
          [hx - 0.1 + s * 0.16, hy + 0.5],
          [hx - 0.02 + s * 0.3, hy + 0.72],
        ],
        { w: 0.05, color: COAT_D, kind: L_BAR, wobble: 0, layer: 5 },
      );
      k.seg(hx - 0.1 + s * 0.16, hy + 0.5, hx - 0.3 + s * 0.2, hy + 0.66, { w: 0.045, color: COAT_D, kind: L_BAR, wobble: 0, layer: 5 });
    }
  }
}

/** An ice cream on a card: a wafer cone with a scoop on it. */
function cornet(k: Plane, a: number, b: number, s: number, scoop: RGB, layer = 5): void {
  k.poly(
    [
      [a - 0.13 * s, b],
      [a + 0.13 * s, b],
      [a, b - 0.36 * s],
    ],
    C.ochre,
    { outline: true, w: 0.03, layer, grain: 0.3 },
  );
  k.circle(a, b + 0.1 * s, 0.16 * s, scoop, { outline: true, w: 0.03, layer: layer + 1, seg: 8, grain: 0.2 });
}

/** A picnic rug: stripes, a hamper, and whoever is sitting on it. */
function rug(c: LondonCtx, x: number, y: number, w: number, d: number, rgb: RGB, n: number): void {
  const { pen, rng } = c;
  pen.obj(() => {
    const g = pen.floor(0, 4);
    g.rect(x, y, x + w, y + d, rgb, { outline: true, w: W_FINE, grain: 0.5 });
    for (let a = x + 0.4; a < x + w; a += 0.4) g.seg(a, y + 0.05, a, y + d - 0.05, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.2, layer: 1 });
    pen.box(x + w - 0.75, y + 0.2, 0, 0.55, 0.4, 0.34, C.wood, { w: W_FINE, top: C.woodDark });
  });
  for (let k = 0; k < n; k++) {
    person(pen, x + 0.45 + (k * (w - 1.3)) / Math.max(1, n - 1), y + 0.5 + (k % 2) * (d - 1.0), -0.38, randomLook(rng), "sit", k % 2 === 1, rng.chance(0.25) ? 0.72 : 1);
  }
}

/** A deckchair with somebody in it: striped canvas between two rails, leaning back. */
function deckchair(c: LondonCtx, x: number, y: number, stripe: RGB, flip: boolean): void {
  const { pen, rng } = c;
  pen.obj(() => {
    const k = pen.card(x, y, 0, flip);
    const w = 0.54;
    for (let i = 0; i < 5; i++) {
      const a0 = -w + (i * 2 * w) / 5;
      const a1 = -w + ((i + 1) * 2 * w) / 5;
      k.poly(
        [
          [a0, 0.28],
          [a1, 0.28],
          [a1 * 1.14, 1.64],
          [a0 * 1.14, 1.64],
        ],
        i % 2 === 0 ? stripe : C.white,
        { layer: -2, grain: 0.4 },
      );
    }
    k.loop(
      [
        [-w, 0.28],
        [w, 0.28],
        [w * 1.14, 1.64],
        [-w * 1.14, 1.64],
      ],
      { w: 0.045, layer: -1 },
    );
    k.bar(-w, 0.3, -w - 0.14, 0.03, 0.07, C.wood, { layer: -3 });
    k.bar(w, 0.3, w + 0.14, 0.03, 0.07, C.wood, { layer: -3 });
    k.bar(-w * 1.14, 1.64, w * 1.14, 1.64, 0.08, C.wood, { layer: -1 });
    person(pen, x, y, 0, randomLook(rng), "sit", flip, 0.95);
  });
}

function park(c: LondonCtx): void {
  const { pen, rng } = c;
  // ---- the lawn in front of the ship: a picnic, old trees
  rug(c, RUGS[0][0], RUGS[0][1], RUGS[0][2], RUGS[0][3], RUGS[0][4], 3);
  pen.obj(() => dogOn(pen.card(22.5, 33.9, 0, true), hex("#e0994d"), { corgi: true }));
  tree(pen, rng, 9.4, 35.3, { kind: "round", r: 1.9, h: 2.3 });
  tree(pen, rng, 27.7, 36.5, { kind: "round", r: 1.7, h: 2.2 });
  tree(pen, rng, 2.6, 35.0, { kind: "elm" });
  squirrel(pen, 10.6, 36.2);
  squirrel(pen, 26.2, 37.0, 0, true);
  pigeon(pen, 21.4, 34.9);
  pigeon(pen, 22.1, 35.3, 0, true, true);
  pigeon(pen, 20.6, 35.4, 0, false, true);
  // somebody with a dog on a lead, keeping it away from the deer
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 24.6, 32.9, 0, lk, "stand", true);
    dogOn(pen.card(23.5, 33.4, 0, true), C.charcoal, { s: 0.9 });
    pen.stroke(
      [
        [24.3, 33.0, 0.9],
        [23.9, 33.3, 0.62],
      ],
      { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 },
    );
  });

  // ---- the lawn to the east: ice cream, deckchairs, another picnic, and a kite going up
  pen.push(31.0, 8.6, 0, 0);
  van(pen, ICE, C.pink);
  pen.obj(() => {
    const f = pen.wall("y+", -2.4, -0.975, 0.3, 4.8, 1.95);
    f.rect(0.55, 0.78, 2.75, 1.6, C.lamp, { outline: true, w: W_FINE, glow: 1, layer: 2, grain: 0.2 });
    f.circle(1.65, 1.22, 0.2, SKIN[1], { layer: 3, seg: 7, grain: 0 });
    f.rect(1.36, 0.78, 1.94, 1.06, C.white, { layer: 3, grain: 0 });
    // the awning over the hatch, and a giant cornet on the roof
    const aw = pen.plane([-1.9, 0.975, 2.0], [1, 0, 0], [0, 0.8, -0.28], 0, true);
    for (let i = 0; i < 5; i++) aw.rect(i * 0.46, 0, (i + 1) * 0.46, 1, i % 2 === 0 ? C.pink : C.white, { grain: 0.5 });
    aw.loop(
      [
        [0, 0],
        [2.3, 0],
        [2.3, 1],
        [0, 1],
      ],
      { w: W_FINE },
    );
    cornet(pen.card(-1.3, 0, 2.2), 0, 0.82, 2.2, C.pink, 1);
    const sg = pen.card(0.75, 0, 2.15);
    sg.rect(-0.95, 0.04, 0.95, 0.76, C.white, { outline: true, w: W_FINE, grain: 0.2, glow: 0.6 });
    sg.text("ICES", 0, 0.2, 0.38, { align: "c", color: C.redDark, kind: L_MARK, w: 0.07, wobble: 0.3, layer: 1 });
  }, 0.15);
  pen.pop();
  // the queue: children first
  for (const [qx, qy, s] of [
    [31.5, 10.4, 0.7],
    [31.7, 11.2, 0.72],
    [31.4, 12.0, 1],
    [31.8, 12.8, 1],
  ]) {
    person(pen, qx, qy, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), s);
  }
  // and one who has been served
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 33.2, 10.9, 0, lk, "wave", false, 0.72);
    cornet(pen.card(33.2, 10.9, 0), 0.46, 1.52, 1, C.yellow);
  });
  deckchair(c, 32.2, 15.7, C.green, false);
  deckchair(c, 33.8, 16.1, C.blue, false);
  deckchair(c, 35.4, 16.5, C.red, true);
  rug(c, RUGS[1][0], RUGS[1][1], RUGS[1][2], RUGS[1][3], RUGS[1][4], 2);
  person(pen, 36.1, 14.6, 0, randomLook(rng), "cheer", true, 0.7);
  flowerBed(pen, rng, 20.2, 0.1, 3.0, 1.5, [C.red, C.yellow, C.white]);
  flowerBed(pen, rng, 24.8, 2.4, 2.8, 1.5, [C.pink, C.purple, C.white]);
  tree(pen, rng, 28.4, 3.0, { kind: "blossom" });
  tree(pen, rng, 37.2, 9.6, { kind: "round" });
  tree(pen, rng, 37.6, 31.0, { kind: "round", r: 1.3 });
  // bushes on the slopes of the hill
  for (const [bx, by] of [
    [24.4, 28.6],
    [25.0, 30.6],
    [37.6, 24.2],
    [36.9, 21.6],
    [27.2, 32.6],
  ]) {
    tree(pen, rng, bx, by, { kind: "bush", z: hillZ(bx, by) });
  }
  // the kite's owner, and a child pointing at it
  person(pen, KITE_FLYER[0], KITE_FLYER[1], 0, randomLook(rng), "cheer");
  person(pen, KITE_FLYER[0] - 0.9, KITE_FLYER[1] + 0.5, 0, randomLook(rng), "wave", true, 0.7);
  // somebody watching the hopping, a couple strolling the line
  person(pen, 20.4, 21.0, 0, randomLook(rng), "wave");
  person(pen, 15.4, 12.2, 0, randomLook(rng), "stand", true);
  person(pen, 16.1, 12.0, 0, randomLook(rng), "stand");
  for (const [lx, ly] of [
    [18.6, 24.6],
    [23.6, 29.9],
    [29.0, 36.2],
    [27.0, 16.0],
    [17.0, 13.6],
  ]) {
    lamp(pen, lx, ly);
  }
}

// ---------------------------------------------------------------- everything that moves

/** A little sailing dinghy, bow towards local +x, waterline at z = 0. */
function dinghy(pen: Pen, sail: RGB, crew: Look): void {
  pen.begin();
  pen.extrude(
    [
      [-1.5, -0.5],
      [0.6, -0.6],
      [1.7, 0],
      [0.6, 0.6],
      [-1.5, 0.5],
    ],
    -0.05,
    0.4,
    C.white,
    { top: C.wood, crease: 28, w: 0.09 },
  );
  pen.pole([0.2, 0, 0.4], [0.2, 0, 3.5], 0.08, C.wood);
  const sp = pen.plane([0, 0.02, 0], [1, 0, 0], [0, 0, 1], 0, true);
  sp.poly(
    [
      [0.1, 0.75],
      [-1.6, 0.85],
      [0.1, 3.4],
    ],
    sail,
    { outline: true, w: W_FINE, grain: 0.6 },
  );
  sp.poly(
    [
      [0.3, 3.1],
      [1.65, 0.5],
      [0.3, 0.65],
    ],
    C.white,
    { outline: true, w: W_FINE, grain: 0.4 },
  );
  person(pen, -0.9, 0, 0.2, crew, "bust");
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [-1.4, s * 0.4, 0.03],
        [-2.4, s * 0.8, 0.03],
      ],
      { w: 0.09, color: C.white, kind: L_RIPPLE, wobble: 0.5, alpha: 0.85 },
    );
  }
  pen.end();
}

/** A gull in the air, wings up or down. */
function gullOn(k: Plane, up: boolean): void {
  k.ellipse(0, 0, 0.26, 0.11, C.white, { outline: true, w: 0.04, seg: 8, grain: 0.2 });
  k.poly(
    [
      [0.24, 0.03],
      [0.42, -0.02],
      [0.24, -0.05],
    ],
    C.yellow,
    { layer: 1, grain: 0 },
  );
  const b = up ? 0.46 : -0.34;
  k.poly(
    [
      [-0.14, 0.04],
      [0.1, 0.04],
      [-0.06, b],
      [-0.4, b * 0.82],
    ],
    C.white,
    { outline: true, w: 0.04, layer: 2, grain: 0.2 },
  );
  k.poly(
    [
      [-0.14, b * 0.86],
      [-0.06, b],
      [-0.4, b * 0.82],
    ],
    C.greyDark,
    { layer: 3, grain: 0 },
  );
}

/** Out along a path and back beside it: a closed loop for people on foot. */
function thereAndBack(pts: V2[], gap: number, z: number, W: (x: number, y: number, z: number) => V3): V3[] {
  const fwd: V3[] = [];
  const back: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = ((a[1] - b[1]) / len) * (gap / 2);
    const ny = ((b[0] - a[0]) / len) * (gap / 2);
    fwd.push(W(pts[i][0] + nx, pts[i][1] + ny, z));
    back.push(W(pts[i][0] - nx, pts[i][1] - ny, z));
  }
  return rounded([...fwd, ...back.reverse()], true, 0.35);
}

function life(c: LondonCtx): void {
  const rng = new Rng(1675);
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + G + z];
  const born = c.done;

  // ---- the time ball: half way up its mast, then to the top, then down in a blink. On the tour it drops just as the camera has arrived.
  const ball = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.circle(0, 0, 0.46, C.red, { outline: true, w: W_FINE, seg: 12, grain: 0.2 });
      k.circle(-0.14, 0.15, 0.11, hex("#f2978c"), { layer: 1, seg: 6, grain: 0 });
    },
    0,
    61,
  );
  const mast = W(MAST[0], MAST[1], MAST_Z);
  c.movers.push((m) => {
    if (m.t < born) return;
    const at = c.visit();
    const drop = at == null ? born + 9 : at + 0.9;
    const p = (((m.t - drop + 11) % 14) + 14) % 14;
    const h = p < 3 ? 0 : p < 7.5 ? 0.5 * smooth(3, 5, p) : p < 11 ? 0.5 + 0.5 * smooth(7.5, 9, p) : 1 - smooth(11, 11.3, p);
    m.put(ball, mast[0], mast[1], mast[2] + 0.5 + h * 2.1, born);
  });

  // ---- the kite, tugging at its line
  const hand = W(KITE_FLYER[0] + 0.45, KITE_FLYER[1], 1.95);
  const sky = W(32.6, 7.4, 11.4);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(sky[0], sky[1], sky[2], 16)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => born;
    dp.rng = new Rng(77);
    const drift = Math.sin(m.t * 0.9) * 1.2 + Math.sin(m.t * 2.3 + 1) * 0.35;
    const lift = Math.sin(m.t * 1.4 + 0.5) * 0.55;
    const kx = sky[0] + drift * EAST[0];
    const ky = sky[1] + drift * EAST[1];
    const kz = sky[2] + lift;
    dp.begin();
    dp.stroke(
      [
        hand,
        [(hand[0] + kx) / 2, (hand[1] + ky) / 2, (hand[2] + kz) / 2 - 0.9],
        [kx, ky, kz - 0.75],
      ],
      { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 },
    );
    const k = dp.card(kx, ky, kz);
    const lean = drift * 0.12;
    k.poly(
      [
        [lean, 0.95],
        [0.58, 0.2],
        [-lean, -0.75],
        [-0.58, 0.2],
      ],
      C.red,
      { outline: true, w: W_FINE, grain: 0.3 },
    );
    k.poly(
      [
        [lean, 0.95],
        [0.58, 0.2],
        [0, 0.2],
      ],
      C.yellow,
      { layer: 1, grain: 0.2 },
    );
    k.poly(
      [
        [-lean, -0.75],
        [-0.58, 0.2],
        [0, 0.2],
      ],
      C.yellow,
      { layer: 1, grain: 0.2 },
    );
    // the tail, with three bows on it
    const tail: V2[] = [];
    for (let q = 0; q <= 6; q++) tail.push([-lean - q * 0.14 + Math.sin(m.t * 3 + q * 0.9) * 0.16, -0.75 - q * 0.36]);
    k.line(tail, { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
    for (const q of [2, 4, 6]) {
      const [a, b] = tail[q];
      k.poly(
        [
          [a - 0.16, b + 0.1],
          [a + 0.16, b - 0.1],
          [a + 0.16, b + 0.1],
          [a - 0.16, b - 0.1],
        ],
        q === 4 ? C.blue : C.yellow,
        { layer: 1, grain: 0.2 },
      );
    }
    dp.end();
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- deer: grazing, then lifting their heads to look about
  const herd: { x: number; y: number; flip: boolean; stag: boolean; ph: number; rate: number }[] = [
    { x: 11.6, y: 34.6, flip: false, stag: true, ph: 0.1, rate: 0.13 },
    { x: 14.6, y: 35.8, flip: true, stag: false, ph: 0.55, rate: 0.11 },
    { x: 17.4, y: 35.0, flip: false, stag: false, ph: 0.8, rate: 0.16 },
    { x: 12.9, y: 36.6, flip: true, stag: false, ph: 0.3, rate: 0.09 },
    { x: 21.6, y: 36.4, flip: true, stag: true, ph: 0.65, rate: 0.12 },
  ];
  const deer: Sprite[][] = [0, 1, 2, 3].map((v) => [
    makeSprite((p) => deerOn(p.card(0, 0, 0, (v & 1) === 1), false, v > 1), 0, 201 + v),
    makeSprite((p) => deerOn(p.card(0, 0, 0, (v & 1) === 1), true, v > 1), 0, 201 + v),
  ]);
  c.movers.push((m) => {
    if (m.t < born) return;
    for (const d of herd) {
      const u = (m.t * d.rate + d.ph) % 1;
      const p = W(d.x, d.y);
      m.put(deer[(d.flip ? 1 : 0) + (d.stag ? 2 : 0)][u < 0.38 ? 1 : 0], p[0], p[1], p[2], born + d.ph * 0.6);
    }
  });

  // ---- hopping from one hemisphere to the other and back
  const hopper = { ...randomLook(rng), top: C.orange };
  const inAir = makeSprite((p) => person(p, 0, 0, 0, hopper, "cheer", false, 0.72), 0, 301);
  const landed = [makeSprite((p) => person(p, 0, 0, 0, hopper, "stand", false, 0.72), 0, 301), makeSprite((p) => person(p, 0, 0, 0, hopper, "stand", true, 0.72), 0, 301)];
  const [hx, hy] = mer(20.6);
  c.movers.push((m) => {
    if (m.t < born) return;
    const beat = 0.85;
    const n = Math.floor(m.t / beat);
    const u = (m.t - n * beat) / beat;
    const from = n % 2 === 0 ? -1 : 1;
    const e = smooth(0, 0.55, u);
    const side = from * (1 - 2 * e) * 0.6;
    const p = W(hx + EAST[0] * side, hy + EAST[1] * side, u < 0.55 ? Math.sin((u / 0.55) * Math.PI) * 0.55 : 0);
    m.put(u < 0.55 ? inAir : landed[from < 0 ? 0 : 1], p[0], p[1], p[2], born);
  });

  // ---- a jingle from the ice cream van
  const note = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.ellipse(0, 0, 0.17, 0.12, C.black, { grain: 0, seg: 8 });
      k.seg(0.15, 0.02, 0.15, 0.62, { w: 0.05, kind: L_BAR, wobble: 0 });
      k.seg(0.15, 0.62, 0.4, 0.5, { w: 0.07, kind: L_BAR, wobble: 0 });
    },
    0,
    71,
  );
  const tune = W(29.6, 8.6, 3.4);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(tune[0], tune[1], tune[2], 8)) return;
    for (let i = 0; i < 3; i++) {
      const u = (m.t / 3.2 + i / 3) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      // each note sketches itself in, then runs its reveal backwards to fade out as it rises
      const p = Math.min(u * 3.2, ((1 - u) / 0.3) * 1.05);
      m.put(note, tune[0] + sx + i * 0.25, tune[1] - sx - i * 0.2, tune[2] + u * 2.8, m.t - p);
    }
  });

  // ---- a dog that has found a ball, round and round the picnic
  const terrier = hex("#f1e6d2");
  const dogRun = [0, 1].map((step) => [false, true].map((flip) => makeSprite((p) => dogOn(p.card(0, 0, 0, flip), terrier, { s: 0.8, step, tail: 0.45 }), 0, 401)));
  const lap: V3[] = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    lap.push(W(20.6 + Math.cos(t) * 3.0, 33.4 + Math.sin(t) * 2.0));
  }
  c.movers.push(
    traveler(new Route(lap, true), {
      speed: 3.4,
      at: 0.2,
      born,
      span: 0.8,
      sprite: (h, t) => dogRun[Math.floor(t * 7) & 1][Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1],
    }),
  );

  // ---- gulls wheeling over the river where the meridian meets it
  const gull = [
    [makeSprite((p) => gullOn(p.card(0, 0, 0), true), 0, 501), makeSprite((p) => gullOn(p.card(0, 0, 0), false), 0, 501)],
    [makeSprite((p) => gullOn(p.card(0, 0, 0, true), true), 0, 501), makeSprite((p) => gullOn(p.card(0, 0, 0, true), false), 0, 501)],
  ];
  c.movers.push((m) => {
    if (m.t < born) return;
    for (let i = 0; i < 4; i++) {
      const a = m.t * (0.5 + i * 0.07) + i * 1.7;
      const x = 3.5 + Math.cos(a) * (5.5 + i * 0.6);
      const y = 3.0 + Math.sin(a) * (3.6 + i * 0.4);
      const p = W(x, y, 5.6 + i * 0.9 + Math.sin(a * 2) * 0.5);
      // which way it is heading across the page
      const right = -Math.sin(a) * (5.5 + i * 0.6) - Math.cos(a) * (3.6 + i * 0.4) > 0;
      m.put(gull[right ? 0 : 1][Math.floor(m.t * 5 + i) & 1], p[0], p[1], p[2], born + i * 0.2);
    }
  });

  // ---- a dinghy tacking about in mid river
  const boat = new Turning((p) => dinghy(p, C.redDark, randomLook(new Rng(9))), 24, 601);
  const water: V3[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    water.push([c.ox - 13 + Math.cos(t) * 4.6 - Math.sin(t) * 1.2, c.oy + 9.2 + Math.sin(t) * 2.9 + Math.cos(t) * 1.5, c.oz]);
  }
  c.movers.push(traveler(new Route(water, true), { speed: 1.7, at: 0.4, born: born + 0.3, span: 2.2, sprite: (h) => boat.at(h) }));

  // ---- people out for a walk: from the river down the meridian and round by the ship to the foot of the steps, and out to the ice cream van
  const stroll = new Route(
    thereAndBack(
      [
        [11.3, 9.9],
        [16.9, 15.5],
        [17.5, 23.6],
        [18.0, 30.6],
        [23.0, 31.9],
        [26.8, 34.7],
        [29.8, 35.5],
      ],
      0.7,
      0,
      W,
    ),
    true,
  );
  for (let i = 0; i < 9; i++) c.movers.push(walker(stroll, rng, born + rng.range(0, 1)));
  const toVan = new Route(
    thereAndBack(
      [
        [18.2, 15.6],
        [26.4, 15.1],
        [29.3, 14.2],
      ],
      0.6,
      0,
      W,
    ),
    true,
  );
  for (let i = 0; i < 4; i++) c.movers.push(walker(toVan, rng, born + rng.range(0, 1)));
}

// ---------------------------------------------------------------- the islet

export const greenwich: LondonBuilder = (c) => {
  const { pen } = c;
  c.early(() => ground(c));
  pen.push(0, 0, G);
  meridian(pen);
  riverside(c);
  pier(c);
  college(c);
  cuttySark(c);
  observatory(c);
  park(c);
  // after dark: a green laser along the meridian, from the transit house out over the river
  const keep = pen.reveal;
  pen.reveal = () => c.t + 2.4;
  pen.obj(() => {
    const z = HILL_H + TRANSIT.h + 0.3;
    const a: V3 = [TRANSIT.x + TRANSIT.w / 2, TRANSIT.y + TRANSIT.d / 2, z];
    const b: V3 = [a[0] - 66, a[1] - 66, z];
    pen.stroke([a, b], { w: 0.55, color: LASER, kind: L_SPARK, wobble: 0, alpha: 0.28 });
    pen.stroke([a, b], { w: 0.17, color: LASER, kind: L_SPARK, wobble: 0 });
  });
  pen.reveal = keep;
  pen.pop();
  life(c);
};
