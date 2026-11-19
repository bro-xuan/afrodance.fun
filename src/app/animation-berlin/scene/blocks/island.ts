// A sample island: a low grassy island with a lighthouse whose beam sweeps
// round after dark, a cottage, sheep, a picnic and a path someone walks.
// Islands get a 40 x 40 local frame round their centre, with z = 0 on the
// paper (or the water of a bay), and no slab: they draw their own ground.

import { V2, V3 } from "../../engine/math";
import { L_LIGHT, L_MARK } from "../../engine/pen";
import { W_FINE, W_THIN, person, randomLook, tree, windowAt } from "../kit";
import { Route, rounded, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder } from "../types";

const TOP = 0.8;

export const island: BlockBuilder = (c) => {
  const { pen, rng } = c;
  // an outline that wanders a little, so it reads as drawn rather than computed
  const outline: V2[] = [];
  for (let k = 0; k < 28; k++) {
    const t = (k / 28) * Math.PI * 2;
    const r = 15 + 1.6 * Math.sin(3 * t + 0.7) + 1.0 * Math.sin(5 * t + 2.1);
    outline.push([20 + Math.cos(t) * r * 1.1, 20 + Math.sin(t) * r * 0.9]);
  }
  const inner: V2[] = outline.map(([x, y]) => [20 + (x - 20) * 0.86, 20 + (y - 20) * 0.86]);
  c.early(() => {
    pen.extrude(outline, 0, TOP, C.sand, { top: C.sand, w: W_THIN });
    pen.floor(TOP, 1).poly(inner, C.grass, { outline: true, w: W_THIN });
  });

  // the lighthouse, in rings of red and white, and its keeper's cottage
  const lx = 14;
  const ly = 14;
  pen.obj(() => {
    for (let k = 0; k < 5; k++) pen.cyl(lx, ly, TOP + k * 2.2, 2.0 - k * 0.12, 2.2, k % 2 ? C.white : C.red, { seg: 12, r2: 2.0 - (k + 1) * 0.12 });
    pen.cyl(lx, ly, TOP + 11, 1.6, 0.3, C.charcoal, { seg: 12 });
    pen.cyl(lx, ly, TOP + 11.3, 1.1, 1.6, C.lamp, { seg: 10, glow: 1 });
    pen.cone(lx, ly, TOP + 12.9, 1.4, 1.5, C.red, { seg: 10 });
  });
  pen.obj(() => {
    pen.box(19, 12, TOP, 5, 4, 2.8, C.white);
    pen.gable(18.8, 11.8, TOP + 2.8, 5.4, 4.4, 2, "x", C.tile, { gable: C.white });
    const f = pen.wall("y+", 19, 12, TOP, 5, 4);
    f.rect(0.6, 0, 1.6, 2, C.door, { outline: true, w: W_FINE });
    windowAt(f, 2.6, 1.0, 4.2, 2.2, true);
  });
  for (let k = 0; k < 5; k++) tree(pen, rng, rng.range(23, 31), rng.range(17, 27), { kind: rng.pick(["round", "tall"]), z: TOP });
  // sheep: white blobs with black faces
  for (let k = 0; k < 6; k++) {
    const cd = pen.card(rng.range(10, 20), rng.range(20, 28), TOP, rng.chance(0.5));
    pen.obj(() => {
      cd.ellipse(0, 0.55, 0.75, 0.45, C.white, { outline: true, w: W_FINE, seg: 12 });
      cd.circle(0.75, 0.75, 0.25, C.black, { seg: 8, layer: 1 });
      cd.seg(-0.4, 0.15, -0.4, 0, { w: 0.09, kind: L_MARK, color: C.black, wobble: 0 });
      cd.seg(0.4, 0.15, 0.4, 0, { w: 0.09, kind: L_MARK, color: C.black, wobble: 0 });
    });
  }
  pen.floor(TOP, 2).rect(24, 27, 26.2, 28.4, C.red, { outline: true, w: W_FINE });
  person(pen, 24.6, 27.7, TOP - 0.2, randomLook(rng), "sit", false);
  person(pen, 25.6, 27.9, TOP - 0.2, randomLook(rng), "sit", true);

  // the beam, sweeping round once it is dark (drawn fresh every frame, only seen at night)
  const wx = c.ox + lx;
  const wy = c.oy + ly;
  const wz = c.oz + TOP + 12.1;
  c.movers.push((m) => {
    if (m.night < 0.05 || !m.sees(wx, wy, wz, 30)) return;
    const a = m.clock * 1.4;
    for (const s of [0, Math.PI]) {
      const end: V3 = [wx + Math.cos(a + s) * 16, wy + Math.sin(a + s) * 16, wz - 1];
      m.pen.stroke([[wx, wy, wz], end], { w: 1.4, kind: L_LIGHT, wobble: 0, alpha: 0.35 });
    }
  });

  // a walk round the island
  const path = new Route(
    rounded(
      inner.map(([x, y]) => [c.ox + 20 + (x - 20) * 0.85, c.oy + 20 + (y - 20) * 0.85, c.oz + TOP] as V3),
      true,
      2,
    ),
    true,
  );
  for (let k = 0; k < 3; k++) c.movers.push(walker(path, rng, c.done + k * 0.3));
};
