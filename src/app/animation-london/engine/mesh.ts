// Geometry storage for the drawing. Everything on screen is one of two things:
//
//   fills: flat coloured triangles, six floats and eight bytes per vertex
//          floats  x y z | t0 u bias
//          bytes   r g b grain | sway glow phase kind
//
//   lines: ink strokes, one instance per straight piece, twelve floats and
//          eight bytes each
//          floats  ax ay az | bx by bz | t0 u0 u1 bias | wA wB
//          bytes   r g b a | swayA swayB phase kind
//
// t0 is the moment (timeline seconds) the object starts drawing itself; u is
// where inside that reveal the vertex sits (lines: stroke order, fills: the
// wipe). bias nudges depth towards the camera so decals win over their wall.

export const FV = 6;
export const FC = 8;
export const LV = 12;
export const LC = 8;

export class Mesh {
  fv: Float32Array;
  fc: Uint8Array;
  fn = 0;
  lv: Float32Array;
  lc: Uint8Array;
  ln = 0;

  constructor(fillVerts = 4096, lineInst = 4096) {
    this.fv = new Float32Array(fillVerts * FV);
    this.fc = new Uint8Array(fillVerts * FC);
    this.lv = new Float32Array(lineInst * LV);
    this.lc = new Uint8Array(lineInst * LC);
  }

  clear(): void {
    this.fn = 0;
    this.ln = 0;
  }

  needFill(n: number): void {
    const want = this.fn + n;
    if (want * FV <= this.fv.length) return;
    let cap = this.fv.length / FV;
    while (cap < want) cap *= 2;
    const fv = new Float32Array(cap * FV);
    fv.set(this.fv.subarray(0, this.fn * FV));
    const fc = new Uint8Array(cap * FC);
    fc.set(this.fc.subarray(0, this.fn * FC));
    this.fv = fv;
    this.fc = fc;
  }

  needLine(n: number): void {
    const want = this.ln + n;
    if (want * LV <= this.lv.length) return;
    let cap = this.lv.length / LV;
    while (cap < want) cap *= 2;
    const lv = new Float32Array(cap * LV);
    lv.set(this.lv.subarray(0, this.ln * LV));
    const lc = new Uint8Array(cap * LC);
    lc.set(this.lc.subarray(0, this.ln * LC));
    this.lv = lv;
    this.lc = lc;
  }
}

/** A small piece of pre-drawn geometry that gets stamped into the moving layer every frame. */
export interface Sprite {
  fv: Float32Array;
  fc: Uint8Array;
  fn: number;
  lv: Float32Array;
  lc: Uint8Array;
  ln: number;
}

export function spriteOf(m: Mesh): Sprite {
  return {
    fv: m.fv.slice(0, m.fn * FV),
    fc: m.fc.slice(0, m.fn * FC),
    fn: m.fn,
    lv: m.lv.slice(0, m.ln * LV),
    lc: m.lc.slice(0, m.ln * LC),
    ln: m.ln,
  };
}

/**
 * Copy a sprite into a mesh at a world position. t0 is the reveal start for
 * the copy: pass `now - progress` to sketch it in (or back out), or a time far
 * in the past to draw it finished.
 */
export function stamp(
  dst: Mesh,
  s: Sprite,
  x: number,
  y: number,
  z: number,
  t0: number,
  scale = 1,
): void {
  if (s.fn > 0) {
    dst.needFill(s.fn);
    const fv = dst.fv;
    const src = s.fv;
    let o = dst.fn * FV;
    const end = s.fn * FV;
    for (let i = 0; i < end; i += FV) {
      fv[o] = src[i] * scale + x;
      fv[o + 1] = src[i + 1] * scale + y;
      fv[o + 2] = src[i + 2] * scale + z;
      fv[o + 3] = t0;
      fv[o + 4] = src[i + 4];
      fv[o + 5] = src[i + 5];
      o += FV;
    }
    dst.fc.set(s.fc, dst.fn * FC);
    dst.fn += s.fn;
  }
  if (s.ln > 0) {
    dst.needLine(s.ln);
    const lv = dst.lv;
    const src = s.lv;
    let o = dst.ln * LV;
    const end = s.ln * LV;
    for (let i = 0; i < end; i += LV) {
      lv[o] = src[i] * scale + x;
      lv[o + 1] = src[i + 1] * scale + y;
      lv[o + 2] = src[i + 2] * scale + z;
      lv[o + 3] = src[i + 3] * scale + x;
      lv[o + 4] = src[i + 4] * scale + y;
      lv[o + 5] = src[i + 5] * scale + z;
      lv[o + 6] = t0;
      lv[o + 7] = src[i + 7];
      lv[o + 8] = src[i + 8];
      lv[o + 9] = src[i + 9];
      lv[o + 10] = src[i + 10];
      lv[o + 11] = src[i + 11];
      o += LV;
    }
    dst.lc.set(s.lc, dst.ln * LC);
    dst.ln += s.ln;
  }
}
