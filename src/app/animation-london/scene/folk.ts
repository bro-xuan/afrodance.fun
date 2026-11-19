// Londoners in costume, and London's animals. Guardsmen in bearskins, police
// in tall helmets, Beefeaters, people under umbrellas; pigeons, ravens, ducks,
// swans, dogs, squirrels and horses. Like the people in kit.ts, they are flat
// figures that face the camera (the horse is the exception: it is round).

import { RGB, Rng, V2, hex } from "../engine/math";
import { L_BAR, L_MARK, Pen, Plane } from "../engine/pen";
import { Look, Pose, W_FINE, person, randomLook, unionJack } from "./kit";
import { C, HAIR, SKIN } from "./palette";

export type Hat = "bearskin" | "helmet" | "bowler" | "top" | "cap" | "mohawk" | "bonnet" | "chef" | "hard";

/** Where the top of a figure's head is, for a pose (before scaling). */
function crown(pose: Pose): number {
  return pose === "bust" ? 1.5 : pose === "sit" ? 1.93 : 2.22;
}

/** Put a hat on someone already drawn at (x, y, z). */
export function hat(pen: Pen, x: number, y: number, z: number, kind: Hat, o: { pose?: Pose; flip?: boolean; s?: number; color?: RGB } = {}): void {
  const s = o.s ?? 1;
  const k = pen.card(x, y, z, o.flip);
  const top = crown(o.pose ?? "stand");
  const P = (pts: V2[]): V2[] => pts.map((p) => [p[0] * s, (top + p[1]) * s]);
  const fill = (pts: V2[], rgb: RGB, layer = 6) => k.poly(P(pts), rgb, { outline: true, w: W_FINE, layer, grain: 0.4 });
  if (kind === "bearskin") {
    fill(
      [
        [-0.36, -0.3],
        [0.36, -0.3],
        [0.41, 0.36],
        [0.22, 0.7],
        [-0.22, 0.7],
        [-0.41, 0.36],
      ],
      o.color ?? C.black,
    );
    k.line(P([[-0.3, -0.3], [0, -0.66], [0.3, -0.3]]), { w: 0.05, color: C.gold, kind: L_MARK, wobble: 0, layer: 7 });
  } else if (kind === "helmet") {
    const pts: V2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * Math.PI;
      pts.push([Math.cos(t) * 0.4, -0.22 + Math.sin(t) * 0.62]);
    }
    fill(pts, o.color ?? C.navy);
    fill(
      [
        [-0.5, -0.3],
        [0.5, -0.3],
        [0.42, -0.18],
        [-0.42, -0.18],
      ],
      o.color ?? C.navy,
      7,
    );
    k.circle(0, (top + 0.02) * s, 0.09 * s, C.metal, { layer: 8, seg: 6, grain: 0 });
  } else if (kind === "bowler" || kind === "top" || kind === "hard") {
    const h = kind === "top" ? 0.6 : 0.34;
    const col = o.color ?? (kind === "hard" ? C.yellow : C.black);
    fill(
      [
        [-0.33, -0.2],
        [0.33, -0.2],
        [0.31, -0.2 + h],
        [0.16, -0.14 + h],
        [-0.16, -0.14 + h],
        [-0.31, -0.2 + h],
      ],
      col,
    );
    fill(
      [
        [-0.52, -0.25],
        [0.52, -0.25],
        [0.52, -0.15],
        [-0.52, -0.15],
      ],
      col,
      7,
    );
  } else if (kind === "cap") {
    fill(
      [
        [-0.42, -0.24],
        [0.42, -0.24],
        [0.36, 0.06],
        [-0.36, 0.06],
      ],
      o.color ?? C.navy,
    );
    fill(
      [
        [0.2, -0.3],
        [0.66, -0.3],
        [0.42, -0.2],
      ],
      o.color ?? C.navy,
      7,
    );
  } else if (kind === "mohawk") {
    const col = o.color ?? C.pink;
    for (let i = -2; i <= 2; i++) {
      fill(
        [
          [i * 0.14 - 0.08, -0.12],
          [i * 0.14 + 0.08, -0.12],
          [i * 0.17, 0.5 - Math.abs(i) * 0.1],
        ],
        col,
      );
    }
  } else if (kind === "bonnet") {
    // the flat black hat of a Yeoman Warder
    fill(
      [
        [-0.56, -0.2],
        [0.56, -0.2],
        [0.5, 0.04],
        [-0.5, 0.04],
      ],
      C.black,
    );
    fill(
      [
        [-0.4, 0.04],
        [0.4, 0.04],
        [0.36, 0.22],
        [-0.36, 0.22],
      ],
      C.black,
      7,
    );
    k.line(P([[-0.4, 0.04], [0.4, 0.04]]), { w: 0.06, color: C.red, kind: L_MARK, wobble: 0, layer: 8 });
  } else {
    // a chef's hat
    fill(
      [
        [-0.3, -0.2],
        [0.3, -0.2],
        [0.42, 0.34],
        [0.2, 0.52],
        [-0.2, 0.52],
        [-0.42, 0.34],
      ],
      C.white,
    );
  }
}

const GUARD_LOOK = (rng: Rng | null): Look => ({ skin: rng ? rng.pick(SKIN) : SKIN[1], hair: C.black, top: C.guard, legs: C.navy, long: false, hat: null });

/** A guardsman: red tunic, white belt, bearskin, and a rifle at the shoulder. */
export function guardsman(pen: Pen, x: number, y: number, z = 0, pose: Pose = "stand", flip = false, rng: Rng | null = null): void {
  pen.begin();
  person(pen, x, y, z, GUARD_LOOK(rng), pose, flip);
  const k = pen.card(x, y, z, flip);
  k.seg(-0.33, 0.98, 0.33, 0.98, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
  for (const b of [1.14, 1.28]) k.circle(0, b, 0.035, C.gold, { layer: 3, seg: 5, grain: 0 });
  k.seg(0.46, 0.75, 0.52, 2.5, { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
  hat(pen, x, y, z, "bearskin", { pose, flip });
  pen.end();
}

/** A police officer in the tall helmet. */
export function bobby(pen: Pen, x: number, y: number, z = 0, pose: Pose = "stand", flip = false, rng: Rng | null = null): void {
  pen.begin();
  person(pen, x, y, z, { skin: rng ? rng.pick(SKIN) : SKIN[0], hair: HAIR[1], top: C.navy, legs: C.navy, long: false, hat: null }, pose, flip);
  const k = pen.card(x, y, z, flip);
  for (const b of [0.9, 1.08, 1.26]) k.circle(0, b, 0.035, C.metal, { layer: 3, seg: 5, grain: 0 });
  hat(pen, x, y, z, "helmet", { pose, flip });
  pen.end();
}

/** A Yeoman Warder of the Tower: scarlet and gold, a white ruff, a flat black hat. */
export function beefeater(pen: Pen, x: number, y: number, z = 0, pose: Pose = "stand", flip = false): void {
  pen.begin();
  person(pen, x, y, z, { skin: SKIN[0], hair: HAIR[7], top: C.guard, legs: C.guard, long: false, hat: null }, pose, flip);
  const k = pen.card(x, y, z, flip);
  for (const b of [0.82, 1.3]) k.seg(-0.33, b, 0.33, b, { w: 0.06, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
  k.seg(0, 0.8, 0, 1.4, { w: 0.06, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
  k.ellipse(0, 1.47, 0.3, 0.1, C.white, { outline: true, w: 0.035, layer: 4, seg: 8, grain: 0 });
  hat(pen, x, y, z, "bonnet", { pose, flip });
  pen.end();
}

/** Someone in a suit, for the City. */
export function suit(rng: Rng): Look {
  const lk = randomLook(rng);
  const cloth = rng.pick([C.navy, C.charcoal, hex("#3c3a3d"), hex("#5b5c69")]);
  lk.top = cloth;
  lk.legs = cloth;
  lk.hat = null;
  return lk;
}

/** Give whoever stands at (x, y, z) an open umbrella. */
export function umbrella(pen: Pen, x: number, y: number, z: number, rgb: RGB, flip = false, s = 1): void {
  const k = pen.card(x, y, z, flip);
  pen.begin();
  k.seg(0.42 * s, 1.2 * s, 0.42 * s, 2.72 * s, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
  const pts: V2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * Math.PI;
    pts.push([(0.42 + Math.cos(t) * 0.92) * s, (2.6 + Math.sin(t) * 0.52) * s]);
  }
  // scalloped lower edge
  for (let i = 0; i < 4; i++) pts.push([(0.42 - 0.92 + (i + 0.5) * 0.46) * s, 2.68 * s]);
  k.poly(pts, rgb, { outline: true, w: W_FINE, layer: 6, grain: 0.4 });
  pen.end();
}

/** A little Union flag on a stick, held up by whoever stands at (x, y). */
export function handFlag(pen: Pen, x: number, y: number, z: number, flip = false): void {
  const k = pen.card(x, y, z, flip);
  pen.begin();
  k.seg(0.52, 1.25, 0.6, 2.72, { w: 0.05, color: C.white, kind: L_BAR, wobble: 0, layer: 4 });
  unionJack(k, 0.62, 2.22, 0.78, 0.46, { sway: 0.3, layer: 5, fine: false });
  pen.end();
}

/** A phone or camera held out in front: for someone standing at (x, y) to take a picture with. */
export function snapper(pen: Pen, x: number, y: number, lk: Look, flip = false): void {
  pen.begin();
  person(pen, x, y, 0, lk, "stand", flip);
  const k = pen.card(x, y, 0, flip);
  k.bar(0.34, 1.34, 0.72, 1.6, 0.17, lk.top, { layer: 4 });
  k.rect(0.7, 1.5, 0.88, 1.82, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  pen.end();
}

// ---------------------------------------------------------------- animals

const PIGEON = hex("#8e97a3");
const PIGEON_D = hex("#5f6874");

/** A pigeon on the ground (pecking or not), or in the air with its wings up or down. Draw it on a card. */
export function pigeonOn(k: Plane, how: "stand" | "peck" | "up" | "down"): void {
  if (how === "stand" || how === "peck") {
    k.ellipse(0, 0.2, 0.25, 0.16, PIGEON, { outline: true, w: 0.045, seg: 8, grain: 0.3 });
    if (how === "peck") k.circle(0.26, 0.14, 0.1, PIGEON_D, { outline: true, w: 0.04, seg: 6, layer: 1 });
    else k.circle(0.2, 0.36, 0.1, PIGEON_D, { outline: true, w: 0.04, seg: 6, layer: 1 });
    k.seg(-0.03, 0.06, -0.03, 0, { w: 0.03, color: C.orange, kind: L_BAR, wobble: 0 });
    k.seg(0.07, 0.06, 0.07, 0, { w: 0.03, color: C.orange, kind: L_BAR, wobble: 0 });
    return;
  }
  k.ellipse(0, 0, 0.26, 0.12, PIGEON, { outline: true, w: 0.045, seg: 8, grain: 0.3 });
  k.circle(0.26, 0.05, 0.09, PIGEON_D, { seg: 6, layer: 1, grain: 0 });
  const b = how === "up" ? 0.42 : -0.3;
  k.poly(
    [
      [-0.12, 0.04],
      [0.1, 0.04],
      [-0.08, b],
      [-0.34, b * 0.8],
    ],
    C.white,
    { outline: true, w: 0.04, layer: 2, grain: 0.2 },
  );
}

/** A pigeon standing at (x, y). */
export function pigeon(pen: Pen, x: number, y: number, z = 0, flip = false, peck = false): void {
  pen.obj(() => pigeonOn(pen.card(x, y, z, flip), peck ? "peck" : "stand"));
}

/** A raven: bigger than a pigeon, and all black. */
export function raven(pen: Pen, x: number, y: number, z = 0, flip = false): void {
  pen.obj(() => {
    const k = pen.card(x, y, z, flip);
    k.ellipse(0, 0.3, 0.4, 0.22, C.black, { outline: true, w: 0.045, seg: 9, grain: 0.4 });
    k.circle(0.34, 0.52, 0.16, C.black, { outline: true, w: 0.04, seg: 7, layer: 1 });
    k.poly(
      [
        [0.46, 0.56],
        [0.72, 0.48],
        [0.46, 0.44],
      ],
      C.charcoal,
      { layer: 2, grain: 0 },
    );
    k.poly(
      [
        [-0.3, 0.34],
        [-0.72, 0.2],
        [-0.3, 0.2],
      ],
      C.black,
      { layer: 1, grain: 0.4, outline: true, w: 0.035 },
    );
    k.seg(-0.04, 0.1, -0.04, 0, { w: 0.04, color: C.charcoal, kind: L_BAR, wobble: 0 });
    k.seg(0.1, 0.1, 0.1, 0, { w: 0.04, color: C.charcoal, kind: L_BAR, wobble: 0 });
  });
}

/** A duck on a card: a mallard, or (small and yellow) a duckling. On water or on land. */
export function duckOn(k: Plane, kind: "drake" | "duck" | "duckling" = "drake", s = 1): void {
  const baby = kind === "duckling";
  const body = baby ? C.yellow : kind === "drake" ? hex("#b9b0a2") : hex("#a8845c");
  const head = baby ? C.yellow : kind === "drake" ? hex("#2f6f4f") : hex("#8a6a48");
  const q = (baby ? 0.55 : 1) * s;
  k.ellipse(0, 0.2 * q, 0.3 * q, 0.19 * q, body, { outline: true, w: 0.04, seg: 8, grain: 0.3 });
  k.circle(0.26 * q, 0.42 * q, 0.14 * q, head, { outline: true, w: 0.04, seg: 7, layer: 1 });
  k.poly(
    [
      [0.37 * q, 0.44 * q],
      [0.56 * q, 0.4 * q],
      [0.37 * q, 0.36 * q],
    ],
    baby ? C.orange : C.yellow,
    { layer: 2, grain: 0 },
  );
}

export function duck(pen: Pen, x: number, y: number, z = 0, kind: "drake" | "duck" | "duckling" = "drake", flip = false): void {
  pen.obj(() => duckOn(pen.card(x, y, z, flip), kind));
}

/** A swan on the water. */
export function swan(pen: Pen, x: number, y: number, z: number, flip = false): void {
  pen.obj(() => {
    const k = pen.card(x, y, z, flip);
    k.ellipse(0, 0.2, 0.52, 0.26, C.white, { outline: true, w: 0.045, seg: 10, grain: 0.2 });
    k.poly(
      [
        [-0.3, 0.3],
        [-0.72, 0.52],
        [-0.42, 0.14],
      ],
      C.white,
      { outline: true, w: 0.04, layer: 1, grain: 0.2 },
    );
    k.line(
      [
        [0.36, 0.3],
        [0.5, 0.6],
        [0.36, 0.84],
        [0.5, 1.0],
      ],
      { w: 0.13, color: C.white, kind: L_BAR, wobble: 0, layer: 2 },
    );
    k.circle(0.52, 1.02, 0.11, C.white, { outline: true, w: 0.04, seg: 7, layer: 3 });
    k.poly(
      [
        [0.6, 1.04],
        [0.82, 0.94],
        [0.6, 0.94],
      ],
      C.orange,
      { layer: 4, grain: 0 },
    );
  });
}

/** A dog on a card, nose towards +a. `long` makes it a dachshund; short legs and big ears make it a corgi. */
export function dogOn(k: Plane, rgb: RGB, o: { s?: number; corgi?: boolean; tail?: number; step?: number } = {}): void {
  const s = o.s ?? 1;
  const leg = (o.corgi ? 0.16 : 0.34) * s;
  const step = o.step ?? 0;
  const body = leg + 0.17 * s;
  for (const [a, d] of [
    [-0.3, step ? 0.1 : 0],
    [-0.18, step ? -0.08 : 0],
    [0.2, step ? -0.1 : 0],
    [0.32, step ? 0.08 : 0],
  ]) {
    k.bar(a * s, body - 0.05 * s, (a + d) * s, 0.03, 0.09 * s, rgb);
  }
  k.ellipse(0, body, 0.42 * s, 0.19 * s, rgb, { outline: true, w: 0.04, seg: 9, grain: 0.3, layer: 1 });
  if (o.corgi) k.ellipse(0.08 * s, body - 0.06 * s, 0.26 * s, 0.1 * s, C.white, { layer: 2, seg: 7, grain: 0 });
  k.circle(0.42 * s, body + 0.2 * s, 0.17 * s, rgb, { outline: true, w: 0.04, seg: 7, layer: 3 });
  k.poly(
    [
      [0.36 * s, body + 0.32 * s],
      [0.42 * s, body + (o.corgi ? 0.58 : 0.46) * s],
      [0.5 * s, body + 0.32 * s],
    ],
    rgb,
    { outline: true, w: 0.035, layer: 4, grain: 0.3 },
  );
  k.circle(0.57 * s, body + 0.17 * s, 0.045 * s, C.black, { layer: 5, seg: 5, grain: 0 });
  k.bar(-0.4 * s, body + 0.08 * s, -0.56 * s, body + (o.tail ?? 0.32) * s, 0.07 * s, rgb, { layer: 1 });
}

export function dog(pen: Pen, x: number, y: number, rgb: RGB = hex("#b98352"), flip = false, s = 1, corgi = false): void {
  pen.obj(() => dogOn(pen.card(x, y, 0, flip), rgb, { s, corgi }));
}

/** A grey squirrel, sitting up. */
export function squirrel(pen: Pen, x: number, y: number, z = 0, flip = false): void {
  pen.obj(() => {
    const k = pen.card(x, y, z, flip);
    const grey = hex("#9a958c");
    k.ellipse(-0.24, 0.34, 0.16, 0.3, grey, { outline: true, w: 0.035, seg: 8, grain: 0.3 });
    k.ellipse(0, 0.2, 0.17, 0.2, grey, { outline: true, w: 0.035, seg: 8, grain: 0.3, layer: 1 });
    k.circle(0.1, 0.44, 0.11, grey, { outline: true, w: 0.035, seg: 7, layer: 2 });
  });
}

/**
 * A horse, nose towards local +x, standing on the ground at the origin. It is
 * built of round bars, so it reads the same from any side. `frame` is the
 * stride (0 or 1). `rider` puts someone on its back.
 */
export function horse(pen: Pen, frame: number, coat: RGB, rider?: (pen: Pen, z: number) => void): void {
  const legs: number[][] =
    frame === 0
      ? [
          [0.72, 0.2, 1.02, 0.02],
          [0.72, -0.2, 0.45, 0.28],
          [-0.7, 0.2, -0.45, 0.28],
          [-0.7, -0.2, -1.02, 0.02],
        ]
      : [
          [0.72, 0.2, 0.5, 0.28],
          [0.72, -0.2, 0.98, 0.02],
          [-0.7, 0.2, -0.98, 0.02],
          [-0.7, -0.2, -0.5, 0.28],
        ];
  pen.begin();
  for (const l of legs) pen.pole([l[0], l[1], 1.15], [l[2], l[1], l[3] + 0.06], 0.17, coat);
  pen.pole([-0.78, 0, 1.4], [0.78, 0, 1.4], 0.86, coat);
  pen.pole([0.85, 0, 1.6], [1.3, 0, 2.3], 0.42, coat);
  pen.pole([1.3, 0, 2.38], [1.74, 0, 2.02], 0.32, coat);
  pen.pole([-1.05, 0, 1.55], [-1.42, 0, 0.95], 0.14, C.black, { ink: false });
  pen.stroke(
    [
      [0.8, 0, 1.98],
      [1.12, 0, 2.52],
    ],
    { w: 0.13, color: C.black, kind: L_BAR, wobble: 0, bias: 0.05 },
  );
  if (rider) rider(pen, 1.55);
  pen.end();
}
