// The Jordaan: the Westerkerk with its crowned tower, two terraces of canal
// houses, back gardens with washing on the line, a market square, the pink
// triangles of the Homomonument stepping down to the water, and houseboats
// along the outer quay. The railway viaduct runs behind (the city draws it).

import { RGB, Rng, V2, V3, hex } from "../../engine/math";
import { L_BAR, L_MARK, Pen } from "../../engine/pen";
import { houseboat } from "../boats";
import { BLOCK, WATER } from "../city";
import {
  HouseSpec,
  W_FINE,
  W_THIN,
  archWindow,
  bench,
  bikeRow,
  bollard,
  cafeTable,
  canalHouse,
  lamp,
  person,
  randomHouse,
  randomLook,
  speckle,
  stall,
  tree,
  tufts,
} from "../kit";
import { Route, makeSprite, rounded, walker } from "../motion";
import { AWNING, C, SHIRT, TULIP } from "../palette";
import { BlockBuilder } from "../types";

const CROWN: RGB = hex("#2e6cb5");

/** A terrace built house by house, so individual houses can be found again afterwards. */
function terrace(pen: Pen, rng: Rng, widths: number[], tweak?: (s: HouseSpec, i: number) => void): { at: number; s: HouseSpec }[] {
  const out: { at: number; s: HouseSpec }[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    const s = randomHouse(rng, w, 7);
    s.side = i === 0 || i === widths.length - 1;
    s.lit = 0.6;
    tweak?.(s, i);
    pen.push(x, 0, 0);
    canalHouse(pen, rng, s);
    pen.pop();
    out.push({ at: x, s });
    x += w;
  });
  return out;
}

function gull(pen: Pen, up: boolean, flip: boolean): void {
  const c = pen.card(0, 0, 0, flip);
  const y = up ? 0.42 : -0.12;
  c.bar(-0.95, y, -0.32, 0.1, 0.14, C.white);
  c.bar(0.95, y, 0.32, 0.1, 0.14, C.white);
  c.ellipse(0, 0, 0.36, 0.17, C.white, { outline: true, w: W_FINE, seg: 8, layer: 1 });
  c.rect(0.3, -0.04, 0.5, 0.05, C.yellow, { layer: 2, grain: 0 });
}

function sofa(pen: Pen): void {
  pen.box(-1.1, -0.45, 0, 2.2, 0.9, 0.45, C.red);
  pen.box(-1.1, -0.45, 0.45, 2.2, 0.28, 0.6, C.red);
  pen.box(-1.1, -0.45, 0.45, 0.28, 0.9, 0.3, C.redDark, { w: W_THIN });
  pen.box(0.82, -0.45, 0.45, 0.28, 0.9, 0.3, C.redDark, { w: W_THIN });
  for (const x of [-0.9, 0.9]) {
    pen.stroke(
      [
        [x, 0, 0.5],
        [0, 0, 1.9],
      ],
      { w: 0.05, kind: L_BAR, wobble: 0 },
    );
  }
}

export const jordaan: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(26, 27);

  // ---------------------------------------------------------------- ground
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(23, 14.4, 41.8, BLOCK - 0.62, C.plaza);
    speckle(pen.floor(0, 2), 23.5, 15, 41.5, 47, C.stoneDark, 0.14);
    // back gardens between the viaduct and the terrace
    g.rect(8.7, 7.2, 15.4, 46.6, C.grass, { outline: true, w: W_THIN });
    tufts(pen.floor(0, 2), 8.9, 7.4, 15.2, 46.4, 0.45);
    // quay walk along the outer water
    g.rect(8.7, 42.4, 23, BLOCK - 0.62, C.street);
    // the Homomonument's triangle set in the square, a point towards the water
    g.poly(
      [
        [27, 37.4],
        [33.4, 37.4],
        [30.2, 43],
      ],
      C.pink,
      { outline: true, w: W_THIN, layer: 1, grain: 0.7 },
    );
    // hopscotch in chalk
    const h = pen.floor(0, 2);
    for (let i = 0; i < 5; i++) {
      h.loop(
        [
          [36.2, 39 + i * 0.9],
          [37.1, 39 + i * 0.9],
          [37.1, 39.9 + i * 0.9],
          [36.2, 39.9 + i * 0.9],
        ],
        { w: 0.06, color: C.white, kind: L_MARK },
      );
    }
  });

  // ---------------------------------------------------------------- canal houses
  // terrace A faces +x across the square; set back from the viaduct so trains stay in view
  const aw = [5, 4.4, 5.2, 4.6, 5, 4.4, 5.2, 4.8];
  pen.push(15.5, 46.4, 0, 270);
  const rowA = terrace(pen, rng, aw, (s, i) => {
    s.h = Math.min(s.h, 10.6);
    if (i === 3) {
      s.gable = "neck";
      s.hoist = true;
      s.h = 10.4;
    }
  });
  pen.pop();
  // terrace B faces +y: shops, a brown café, and the house with the queue
  const bw = [4.6, 5, 4.4, 4.6];
  pen.push(23.3, 7.2, 0, 0);
  terrace(pen, rng, bw, (s, i) => {
    if (i === 1) {
      s.gable = "spout";
      s.color = C.charcoal;
      s.door = C.door;
      s.shop = null;
    } else if (i === 3) s.shop = C.red;
    else if (i === 0) s.shop = rng.pick(AWNING);
  });
  const sign = pen.wall("y+", 0, 0, 0, 18.6, 7.2);
  sign.rect(5, 2.72, 9.2, 3.2, C.white, { outline: true, w: W_FINE, layer: 3 });
  sign.text("ANNE FRANK HUIS", 7.1, 2.84, 0.24, { align: "c", layer: 4, w: 0.05 });
  pen.pop();
  // the queue, all the way along the terrace
  for (let i = 0; i < 12; i++) {
    person(pen, 30.6 + i * 0.86 + rng.range(-0.1, 0.1), 15.5 + (i % 2) * 0.35, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), i % 3 === 0, rng.chance(0.15) ? 0.72 : 1);
  }
  // café terrace in front of the corner shop
  cafeTable(pen, rng, 25.2, 16.6, C.orange, 2);
  cafeTable(pen, rng, 27.8, 17.2, null, 3);

  // ---------------------------------------------------------------- back gardens
  let gy = 46.4;
  aw.forEach((w, i) => {
    const y0 = gy - w;
    // fence between plots
    pen.stroke(
      [
        [8.8, y0, 0],
        [15.3, y0, 0],
      ],
      { w: 0.07, color: C.woodDark, kind: L_MARK },
    );
    const kind = i % 4;
    if (kind === 0) {
      // washing line
      pen.obj(() => {
        pen.pole([9.6, y0 + w / 2, 0], [9.6, y0 + w / 2, 2.1], 0.09, C.white);
        pen.pole([14.4, y0 + w / 2, 0], [14.4, y0 + w / 2, 2.1], 0.09, C.white);
        pen.stroke(
          [
            [9.6, y0 + w / 2, 2.0],
            [14.4, y0 + w / 2, 2.0],
          ],
          { w: 0.04, kind: L_BAR, wobble: 0 },
        );
        for (let k = 0; k < 5; k++) {
          const cd = pen.card(10.3 + k * 0.85, y0 + w / 2, 1.15);
          const ww = rng.range(0.45, 0.7);
          cd.rect(-ww / 2, 0, ww / 2, 0.85, rng.pick(SHIRT), { outline: true, w: W_FINE, sway: 0.3 });
        }
      });
    } else if (kind === 1) {
      pen.obj(() => {
        pen.box(9.2, y0 + 0.6, 0, 2.2, 2.2, 1.7, C.wood);
        pen.gable(9.1, y0 + 0.5, 1.7, 2.4, 2.4, 0.8, "y", C.slate, { gable: C.wood });
      });
      tree(pen, rng, 13.4, y0 + w / 2, { kind: "bush" });
    } else if (kind === 2) {
      tree(pen, rng, 11, y0 + w / 2, { kind: "blossom", h: 1.3, r: 1.1 });
      person(pen, 13.6, y0 + w / 2 + 0.4, 0, randomLook(rng), "sit", false);
      pen.box(12.9, y0 + w / 2 - 0.5, 0, 1.6, 0.6, 0.3, C.yellow, { w: W_FINE });
    } else {
      // vegetable patch
      const v = pen.floor(0, 3);
      v.rect(9.4, y0 + 0.7, 14.4, y0 + w - 0.7, C.woodDark, { outline: true, w: W_FINE, grain: 0.8 });
      v.ticks(9.6, y0 + 0.9, 14.2, y0 + w - 0.9, { n: 26, len: 0.4, ang: 1.2, jit: 0.6, color: C.leaf, w: 0.12, layer: 1 });
      person(pen, 12, y0 + w - 0.5, 0, randomLook(rng), "stand", true);
    }
    gy = y0;
  });

  // ---------------------------------------------------------------- the Westerkerk
  const nx = 25;
  const ny = 18.9;
  const nl = 11.6;
  pen.obj(() => {
    pen.box(nx, ny, 0, nl, 7, 7.2, C.brick);
    const f = pen.wall("y+", nx, ny, 0, nl, 7);
    for (let i = 0; i < 5; i++) {
      archWindow(f, 0.85 + i * 2.15, 1.5, 2.25 + i * 2.15, 6.3, rng.chance(0.75), C.stone);
    }
    for (let i = 0; i <= 5; i++) f.rect(0.1 + i * 2.15, 0, 0.6 + i * 2.15, 7.2, C.stone, { grain: 0.4, layer: 0 });
    f.rect(0, 6.75, nl, 7.2, C.stone, { grain: 0.4, layer: 0 });
  });
  pen.obj(() => {
    pen.gable(nx - 0.3, ny - 0.3, 7.2, nl + 0.3, 7.6, 3.9, "x", C.slate, { gable: C.brick });
  }, 0.15);

  const tx = nx + nl;
  const ty = 20.1;
  const tw = 4.6;
  pen.obj(() => {
    pen.box(tx, ty, 0, tw, tw, 15, C.brick);
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, tx, ty, 0, tw, tw);
      for (const b of [4.9, 9.7]) f.rect(0, b, tw, b + 0.32, C.stone, { grain: 0.4 });
      f.rect(0, 0, 0.42, 15, C.stone, { grain: 0.4 });
      f.rect(tw - 0.42, 0, tw, 15, C.stone, { grain: 0.4 });
      archWindow(f, tw / 2 - 0.5, 5.9, tw / 2 + 0.5, 8.6, false, C.stone);
      // the clock
      f.circle(tw / 2, 12.3, 1.38, C.charcoal, { layer: 1, seg: 18, grain: 0.4 });
      f.circle(tw / 2, 12.3, 1.18, C.white, { outline: true, w: W_FINE, layer: 2, seg: 18, grain: 0.3 });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        f.seg(tw / 2 + Math.cos(a) * 0.92, 12.3 + Math.sin(a) * 0.92, tw / 2 + Math.cos(a) * 1.08, 12.3 + Math.sin(a) * 1.08, { w: 0.06, wobble: 0, layer: 3 });
      }
      f.seg(tw / 2, 12.3, tw / 2 - 0.5, 12.75, { w: 0.11, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      f.seg(tw / 2, 12.3, tw / 2 + 0.72, 12.72, { w: 0.08, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
      if (side === "x+") {
        // the door, at the foot of the tower
        const door: V2[] = [
          [tw / 2 - 0.85, 0],
          [tw / 2 + 0.85, 0],
          [tw / 2 + 0.85, 2.2],
        ];
        for (let k = 1; k < 6; k++) door.push([tw / 2 + Math.cos((k / 6) * Math.PI) * 0.85, 2.2 + Math.sin((k / 6) * Math.PI) * 0.85]);
        door.push([tw / 2 - 0.85, 2.2]);
        f.poly(door, C.door, { outline: true, w: W_THIN, layer: 1 });
      }
    }
  });
  pen.obj(() => {
    pen.box(tx - 0.28, ty - 0.28, 15, tw + 0.56, tw + 0.56, 0.5, C.stone);
  }, 0.14);
  const tier = (inset: number, z: number, h: number, delay: number) => {
    pen.obj(() => {
      const w = tw - inset * 2;
      pen.box(tx + inset, ty + inset, z, w, w, h, C.stone);
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, tx + inset, ty + inset, z, w, w);
        archWindow(f, w * 0.26, 0.4, w * 0.74, h - 0.5, false, C.quayCap);
      }
      pen.box(tx + inset - 0.16, ty + inset - 0.16, z + h, w + 0.32, w + 0.32, 0.26, C.stoneDark, { w: W_THIN });
    }, delay);
  };
  tier(0.55, 15.5, 3.5, 0.26);
  tier(1.0, 19.26, 2.9, 0.38);
  const cx = tx + tw / 2;
  const cy = ty + tw / 2;
  pen.obj(() => {
    pen.cyl(cx, cy, 22.42, 0.95, 1.9, C.stone, { seg: 8, crease: 20 });
    // the crown: Maximilian's, blue and gold
    pen.dome(cx, cy, 24.32, 1.18, 1.25, CROWN, { seg: 12, rings: 4 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const pts: V3[] = [];
      for (let q = 0; q <= 5; q++) {
        const ph = (q / 5) * Math.PI * 0.5;
        pts.push([cx + Math.cos(a) * Math.cos(ph) * 1.2, cy + Math.sin(a) * Math.cos(ph) * 1.2, 24.32 + Math.sin(ph) * 1.27]);
      }
      pen.stroke(pts, { w: 0.13, color: C.gold, kind: L_MARK, wobble: 0 });
    }
    pen.cyl(cx, cy, 25.57, 0.3, 0.45, C.gold, { seg: 8 });
    pen.pole([cx, cy, 26], [cx, cy, 27.3], 0.07, C.gold, { ink: false });
    pen.stroke(
      [
        [cx - 0.3, cy + 0.3, 26.8],
        [cx + 0.3, cy - 0.3, 26.8],
      ],
      { w: 0.07, color: C.gold, kind: L_BAR, wobble: 0 },
    );
  }, 0.5);

  // ---------------------------------------------------------------- the square
  pen.push(24.6, 29.6, 0, 0);
  stall(pen, rng, { sign: "HARING", a: C.blue, goods: [C.sky, C.white, C.grey, C.red] });
  pen.pop();
  pen.push(28.8, 30.2, 0, 0);
  stall(pen, rng, { sign: "BLOEMEN", a: C.green, goods: TULIP.slice() });
  pen.pop();
  pen.push(33.6, 29.4, 0, 0);
  stall(pen, rng, { sign: "KAAS", a: C.orange, goods: [C.yellow, C.gold, C.ochre] });
  pen.pop();
  // shoppers
  for (let i = 0; i < 9; i++) {
    person(pen, rng.range(24.8, 37), rng.range(32.6, 34.4), 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
  // someone eating a herring the proper way: head back, fish by the tail
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 25.9, 32.6, 0, lk, "cheer", false);
    const cd = pen.card(25.9, 32.6, 0);
    cd.bar(0.55, 2.1, 0.6, 2.75, 0.13, C.slateLight, { layer: 6 });
  });
  // café tables under the tower
  cafeTable(pen, rng, 38.6, 27.4, C.red, 2);
  cafeTable(pen, rng, 39.4, 30.6, C.yellow, 3);
  cafeTable(pen, rng, 37.2, 33.6, C.red, 2);
  // flowers and visitors at the monument
  for (let i = 0; i < 7; i++) {
    const cd = pen.card(rng.range(28.4, 32), rng.range(38, 40.4), 0);
    cd.circle(0, 0.2, 0.2, rng.pick(TULIP), { seg: 6, grain: 0, layer: 1 });
  }
  person(pen, 26.4, 39.6, 0, randomLook(rng), "stand", false);
  person(pen, 33.6, 40.2, 0, randomLook(rng), "stand", true);
  person(pen, 34.3, 39.9, 0, randomLook(rng), "stand", false);
  // children at the hopscotch, one mid-hop
  person(pen, 36.65, 40.4, 0.35, randomLook(rng), "cheer", false, 0.7);
  person(pen, 35.4, 39.2, 0, randomLook(rng), "wave", true, 0.7);
  person(pen, 38, 41.2, 0, randomLook(rng), "stand", false, 0.7);
  bench(pen, 24.6, 36.4, 90);
  bench(pen, 35.6, 44.6, 0);
  person(pen, 35.2, 44.6, 0.3, randomLook(rng), "sit", false);
  lamp(pen, 34.6, 36.6);
  lamp(pen, 24, 26.4);
  tree(pen, rng, 24.4, 41.4, { kind: "elm" });
  tree(pen, rng, 39.8, 37.2, { kind: "elm" });
  tree(pen, rng, 24.2, 22, { kind: "round" });
  bikeRow(pen, rng, 23.6, 44.8, 9, 0, 0.62);
  // movers shifting a sofa in through the top floor
  const hoist = rowA[3];
  const hy = 46.4 - (hoist.at + hoist.s.w / 2);
  const hx = 15.5 + 7 + 0.9;
  const hz = hoist.s.h + hoist.s.w * 0.6 + 0.25;
  person(pen, hx + 1.3, hy - 0.9, 0, randomLook(rng), "cheer", false);
  person(pen, hx + 1.5, hy + 1.0, 0, randomLook(rng), "cheer", true);
  pen.box(hx + 2.4, hy - 2.6, 0, 1.2, 0.9, 0.9, C.wood, { w: W_THIN });
  pen.box(hx + 2.6, hy - 2.4, 0.9, 0.8, 0.6, 0.6, C.woodDark, { w: W_THIN });

  // ---------------------------------------------------------------- outer quay
  for (let x = 10; x < 23; x += 6.4) tree(pen, rng, x, 46.3, { kind: "elm" });
  for (let x = 9.2; x < 41; x += 2.9) if (rng.chance(0.7)) bollard(pen, x, 45.2);
  lamp(pen, 17, 45.2);
  lamp(pen, 40.6, 45.4);
  bikeRow(pen, rng, 11.4, 44.4, 5, 0, 0.62);
  person(pen, 20.6, 47.5, -0.35, randomLook(rng), "sit", false);
  person(pen, 21.5, 47.5, -0.35, randomLook(rng), "sit", true);
  // the monument's third triangle, down at the water
  pen.obj(() => {
    pen.extrude(
      [
        [33, 48],
        [40.4, 48],
        [36.7, 53.4],
      ],
      WATER,
      WATER + 0.55,
      C.pink,
      { w: W_THIN },
    );
    pen.extrude(
      [
        [34, 48],
        [39.4, 48],
        [36.7, 52],
      ],
      WATER + 0.55,
      WATER + 1.1,
      C.pink,
      { w: W_THIN },
    );
    person(pen, 36.2, 49.2, WATER + 1.1, randomLook(rng), "sit", false);
    person(pen, 37.3, 49.6, WATER + 1.1, randomLook(rng), "sit", true);
  });
  // houseboats
  pen.push(14.2, 50.1, WATER, 0);
  houseboat(pen, rng, { L: 11 });
  pen.pop();
  pen.push(26.4, 50.1, WATER, 0);
  houseboat(pen, rng, { L: 10 });
  pen.pop();
  for (const x of [15.5, 27]) {
    pen.pole([x, 47.6, 0.05], [x, 48.7, WATER + 0.5], 0.3, C.wood);
  }

  // ---------------------------------------------------------------- movers
  const born = c.done;
  const wx = (x: number) => c.ox + x;
  const wy = (y: number) => c.oy + y;

  // the sofa on its way up to the top floor, and down again when it will not fit
  const sofaSprite = makeSprite(sofa, 0, 5);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(wx(hx), wy(hy), 6, 12)) return;
    const z = 1.2 + (hz - 4.6) * (0.5 - 0.5 * Math.cos((m.t - born) * 0.55));
    m.put(sofaSprite, wx(hx), wy(hy), z, born);
    m.pen.stroke(
      [
        [wx(hx), wy(hy), z + 1.9],
        [wx(hx), wy(hy), hz - 0.4],
      ],
      { w: 0.05, kind: L_BAR, wobble: 0 },
    );
  });

  // gulls wheeling round the tower
  const gulls = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => gull(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 5; k++) {
    const r = 4.5 + k * 1.3;
    const sp = (0.5 + 0.09 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const hgt = 20 + k * 1.4;
    const b0 = born + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const x = wx(cx) + Math.cos(a) * r;
      const y = wy(cy) + Math.sin(a) * r * 0.8;
      const z = hgt + Math.sin(m.t * 0.7 + ph) * 1.2;
      // which way it is moving across the page decides which way the bird faces
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 5 + ph) & 1;
      m.put(gulls[flap][vx - vy < 0 ? 1 : 0], x, y, z, b0);
    });
  }

  // people crossing the square
  const loop = (pts: V2[]) =>
    new Route(
      rounded(
        pts.map((p) => [wx(p[0]), wy(p[1]), 0] as V3),
        true,
        1.2,
      ),
      true,
    );
  const r1 = loop([
    [24.4, 27.6],
    [40.6, 27.6],
    [40.6, 46.4],
    [24.4, 46.4],
  ]);
  const r2 = loop([
    [36, 35.6],
    [26, 35.6],
    [26, 44.4],
    [36, 44.4],
  ]);
  for (let k = 0; k < 5; k++) c.movers.push(walker(r1, rng, born + rng.range(0, 1)));
  for (let k = 0; k < 4; k++) c.movers.push(walker(r2, rng, born + rng.range(0, 1)));
};
