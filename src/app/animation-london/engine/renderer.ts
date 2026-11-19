// WebGL2 renderer for the drawing.
//
// The scene is real 3D seen through a fixed isometric camera, so a depth
// buffer sorts everything: a boat really does pass under its bridge and a
// cyclist really does disappear behind a house. On top of that sit the things
// that make it read as a drawing: ink strokes are screen-space capsules with
// soft edges, fills pick up paper grain and dry-brush gaps, and each object is
// revealed stroke by stroke, then colour.

import { FC, FV, LC, LV, Mesh } from "./mesh";
import { Rng } from "./math";

const FILL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aRev;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 aFx;
uniform vec3 uCam;
uniform vec2 uHalf;
uniform vec2 uDepth;
uniform float uTime;
uniform float uClock;
out vec3 vCol;
out vec2 vPaper;
out vec3 vRev;
out vec4 vFx;
void main() {
  vec2 paper = vec2((aPos.x - aPos.y) * 0.8660254, (aPos.x + aPos.y) * 0.5 - aPos.z);
  vPaper = paper;
  if (aFx.x > 0.0) {
    float ph = aFx.z * 6.2831853;
    paper.x += aFx.x * (0.5 * sin(uClock * 1.5 + ph) + 0.18 * sin(uClock * 2.9 + ph * 2.0));
  }
  vec2 s = (paper - uCam.xy) * uCam.z;
  float depth = aPos.x + aPos.y + aPos.z + aRev.z;
  gl_Position = vec4(s.x / uHalf.x, -s.y / uHalf.y, (uDepth.x - depth) * uDepth.y, 1.0);
  vCol = aCol.rgb;
  vRev = vec3(uTime - aRev.x, aRev.y, aCol.a);
  vFx = aFx;
}`;

// The colour wipe throws pixels away while an object is arriving. A shader
// that can throw pixels away stops the GPU from skipping surfaces hidden behind
// others, so there are two versions: this one while things are still being
// drawn in, and one without the wipe for the finished city.
const fillFs = (wipe: boolean) => `#version 300 es
precision highp float;
in vec3 vCol;
in vec2 vPaper;
in vec3 vRev;
in vec4 vFx;
uniform sampler2D uNoise;
uniform vec2 uReveal;
uniform float uClock;
uniform float uNight;
out vec4 outColor;
void main() {
  // The grain is looked up first, before anything can branch or discard: a
  // texture's mip level comes from how its coordinates change across
  // neighbouring pixels, and that is only defined in straight-line code.
  // Lookups inside a branch name their level outright (textureLod) instead.
  float tooth = texture(uNoise, vPaper * 0.085).g;
  float streak = texture(uNoise, vec2(vPaper.x * 0.013 + vPaper.y * 0.11, vPaper.y * 0.02 - vPaper.x * 0.06)).b;
${
  wipe
    ? `  float f = (vRev.x - uReveal.x) / uReveal.y;
  if (f < 1.0) {
    float edge = textureLod(uNoise, vPaper * 0.021, 0.0).r;
    if (f * 1.35 < vRev.y + edge * 0.35) discard;
  }`
    : ""
}
  float g = vRev.z;
  vec3 c = vCol;
  c *= 1.0 + (tooth - 0.5) * 0.13 * g;
  c = mix(c, vec3(1.0), smoothstep(0.64, 0.86, streak) * 0.2 * g);
  int kind = int(vFx.w * 255.0 + 0.5);
  if (kind == 1) {
    float w = sin(vPaper.y * 5.2 + sin(vPaper.x * 0.9 + uClock * 0.7) * 1.4 + uClock * 0.5);
    float mask = textureLod(uNoise, vPaper * 0.03 + vec2(uClock * 0.004, 0.0), 0.0).a;
    c = mix(c, vec3(1.0), smoothstep(0.9, 1.0, w) * smoothstep(0.5, 0.72, mask) * 0.6);
  }
  if (uNight > 0.0) {
    vec3 dark = c * vec3(0.27, 0.33, 0.55) + vec3(0.015, 0.025, 0.07);
    float flick = 0.92 + 0.08 * sin(uClock * 3.0 + vFx.z * 40.0);
    // most things that glow turn to warm lamplight; neon keeps its own colour
    vec3 glow = kind == 2 ? min(vCol * 1.25 + 0.06, vec3(1.0)) : vec3(1.0, 0.86, 0.5) * flick;
    vec3 lit = mix(dark, glow, vFx.y);
    c = mix(c, lit, uNight);
  }
  outColor = vec4(c, 1.0);
}`;

const LINE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 aA;
layout(location=2) in vec3 aB;
layout(location=3) in vec4 aRev;
layout(location=4) in vec2 aW;
layout(location=5) in vec4 aCol;
layout(location=6) in vec4 aFx;
uniform vec3 uCam;
uniform vec2 uHalf;
uniform vec2 uDepth;
uniform float uTime;
uniform float uClock;
uniform float uMinPx;
uniform vec2 uReveal;
uniform highp int uPass;
out vec4 vCol;
out vec3 vGeo;
out vec2 vHW;
out vec3 vRev;
flat out int vKind;
vec2 proj(vec3 p) {
  return vec2((p.x - p.y) * 0.8660254, (p.x + p.y) * 0.5 - p.z);
}
void main() {
  vec2 pa = proj(aA);
  vec2 pb = proj(aB);
  float ph = aFx.z * 6.2831853;
  float sw = 0.5 * sin(uClock * 1.5 + ph) + 0.18 * sin(uClock * 2.9 + ph * 2.0);
  pa.x += aFx.x * sw;
  pb.x += aFx.y * sw;
  int kind = int(aFx.w * 255.0 + 0.5);
  if (kind == 2) {
    float d = 0.25 * sin(uClock * 0.8 + ph * 3.0);
    pa.x += d;
    pb.x += d;
  }
  vec2 sa = (pa - uCam.xy) * uCam.z;
  vec2 sb = (pb - uCam.xy) * uCam.z;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float p = uTime - aRev.x;
  float inked = smoothstep(uReveal.x, uReveal.x + uReveal.y, p);
  float ww = mix(aW.x, aW.y, aCorner.x);
  if (kind == 0) ww *= mix(0.7, 1.0, inked);
  float wpx = ww * uCam.z;
  float hw = max(wpx, uMinPx) * 0.5;
  float ext = hw + 1.0;
  vec2 pos = mix(sa, sb, aCorner.x) + dir * (aCorner.x * 2.0 - 1.0) * ext + nrm * aCorner.y * ext;
  // A stroke is flat on the screen but sits on surfaces that tilt away from
  // it, so lift it towards the camera by enough to clear its own half width.
  // Free-standing bars (posts, limbs) are not on a surface and keep their true depth.
  float lift = kind == 4 ? 0.0 : (hw / uCam.z) * 2.3;
  // Light spills over whatever is right next to it instead of being cut by its outlines.
  if (kind == 3 || kind == 5) lift = 2.5;
  // position along the stroke as a fraction of its length, running past both ends for the caps
  float along = len > 1e-4 ? (aCorner.x > 0.5 ? (len + ext) / len : -ext / len) : aCorner.x;
  float depth = mix(aA.x + aA.y + aA.z, aB.x + aB.y + aB.z, along) + aRev.w + lift;
  gl_Position = vec4(pos.x / uHalf.x, -pos.y / uHalf.y, (uDepth.x - depth) * uDepth.y, 1.0);
  // The depth pass only keeps a stroke's solid core, and a stroke under two
  // pixels wide hardly has one: leave those out of it altogether (in the wide
  // view that is nearly every stroke, and half the work).
  if (uPass == 0 && wpx < 1.9) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vGeo = vec3(aCorner.x > 0.5 ? len + ext : -ext, aCorner.y * ext, len);
  vHW = vec2(hw, clamp(wpx / uMinPx, 0.4, 1.0));
  vRev = vec3(p, mix(aRev.y, aRev.z, along), inked);
  vCol = aCol;
  vKind = kind;
}`;

const LINE_FS = `#version 300 es
precision highp float;
in vec4 vCol;
in vec3 vGeo;
in vec2 vHW;
in vec3 vRev;
flat in int vKind;
uniform float uSketch;
uniform float uNight;
uniform vec3 uPaper;
uniform highp int uPass;
out vec4 outColor;
void main() {
  if (vRev.x < vRev.y * uSketch) discard;
  float dx = max(max(-vGeo.x, vGeo.x - vGeo.z), 0.0);
  float dist = length(vec2(dx, vGeo.y));
  float cov = clamp(vHW.x + 0.5 - dist, 0.0, 1.0);
  if (uPass == 0) {
    // depth only: the solid core of opaque strokes, so nearer ink hides farther ink
    if (cov < 0.999 || vHW.y * vCol.a < 0.9 || vKind == 3 || vKind == 5) discard;
    outColor = vec4(0.0);
    return;
  }
  float a = cov * vHW.y * vCol.a;
  vec3 c = vCol.rgb;
  if (vKind == 0) {
    c = mix(mix(c, uPaper, 0.25), c, vRev.z);
    c = mix(c, c * vec3(0.55, 0.6, 0.9), uNight);
  } else if (vKind == 3) {
    // light: a crisp bulb when it is small, a glow that fades towards its edge when it is wide
    float fall = clamp(1.0 - dist / (vHW.x + 0.5), 0.0, 1.0);
    a = mix(a, vCol.a * fall * fall * 1.7, smoothstep(3.0, 9.0, vHW.x)) * uNight;
    c = vec3(1.0, 0.9, 0.62);
  } else if (vKind == 5) {
    a *= uNight;
  } else {
    c = mix(c, c * vec3(0.3, 0.36, 0.58) + vec3(0.015, 0.025, 0.07), uNight);
  }
  if (a < 0.004) discard;
  outColor = vec4(c * a, a);
}`;

const POST_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uNoise;
uniform vec2 uPx;
uniform vec3 uPaper;
uniform float uFade;
out vec4 outColor;
void main() {
  vec2 px = vUv * uPx;
  float fibre = texture(uNoise, px / 190.0).g;
  float blot = texture(uNoise, px / 900.0 + 0.37).r;
  vec2 q = vUv - 0.5;
  float vig = smoothstep(0.35, 0.95, dot(q, q) * 2.2);
  float m = 1.0 - (fibre - 0.5) * 0.07 - (blot - 0.5) * 0.035 - vig * 0.07;
  // (the fade back to blank paper keeps the grain, so nothing jumps when the loop starts again)
  outColor = vec4(uPaper * uFade * m, m * (1.0 - uFade));
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type) as WebGLShader;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader: " + log);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram() as WebGLProgram;
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  // once linked, the program keeps what it needs: the shaders can go
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(p));
  return p;
}

/** Tileable value noise, 0..1, on a size x size grid. */
function valueNoise(size: number, cells: number, rng: Rng): Float32Array {
  const grid = new Float32Array(cells * cells);
  for (let i = 0; i < grid.length; i++) grid[i] = rng.next();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const a = grid[(y0 % cells) * cells + (x0 % cells)];
      const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)];
      const c = grid[((y0 + 1) % cells) * cells + (x0 % cells)];
      const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

function noiseTexture(size: number): Uint8Array {
  const rng = new Rng(20261119);
  const r1 = valueNoise(size, 8, rng);
  const r2 = valueNoise(size, 24, rng);
  const g1 = valueNoise(size, 128, rng);
  const g2 = valueNoise(size, 48, rng);
  const b1 = valueNoise(size, 64, rng);
  const b2 = valueNoise(size, 20, rng);
  const a1 = valueNoise(size, 12, rng);
  const a2 = valueNoise(size, 40, rng);
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = Math.round((r1[i] * 0.7 + r2[i] * 0.3) * 255);
    out[i * 4 + 1] = Math.round((g1[i] * 0.72 + g2[i] * 0.28) * 255);
    out[i * 4 + 2] = Math.round((b1[i] * 0.6 + b2[i] * 0.4) * 255);
    out[i * 4 + 3] = Math.round((a1[i] * 0.65 + a2[i] * 0.35) * 255);
  }
  return out;
}

interface Batch {
  vao: WebGLVertexArrayObject;
  fbuf: WebGLBuffer;
  cbuf: WebGLBuffer;
  count: number;
}

export interface Frame {
  /** Timeline seconds: drives the sketch-in of every object. */
  time: number;
  /** Free-running seconds: wind and water. */
  clock: number;
  /** Camera centre on the paper and zoom in CSS pixels per world unit. */
  camX: number;
  camY: number;
  zoom: number;
  night: number;
  fade: number;
  dyn: Mesh | null;
  /** True once everything in the static city has finished arriving. */
  settled: boolean;
}

/**
 * Depth is x + y + z: how far a point is towards the camera. The drawing
 * spans about -35 to 350, and the depth buffer is stretched over this range
 * and no more, so that even a 16-bit buffer can tell a window from its wall.
 * Anything outside the range is not drawn.
 */
export const DEPTH_MID = 157;
export const DEPTH_HALF = 250;

export const PAPER_DAY: [number, number, number] = [0.953, 0.937, 0.894];
export const PAPER_NIGHT: [number, number, number] = [0.085, 0.105, 0.19];

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private fillP: WebGLProgram;
  private solidP: WebGLProgram;
  private lineP: WebGLProgram;
  private postP: WebGLProgram;
  private uFill: Record<string, WebGLUniformLocation | null> = {};
  private uSolid: Record<string, WebGLUniformLocation | null> = {};
  private uLine: Record<string, WebGLUniformLocation | null> = {};
  private uPost: Record<string, WebGLUniformLocation | null> = {};
  private sFill: Batch;
  private sLine: Batch;
  private dFill: Batch;
  private dLine: Batch;
  private noise: WebGLTexture;
  private quad: WebGLBuffer;
  private postVao: WebGLVertexArrayObject;
  width = 1;
  height = 1;
  dpr = 1;
  /** The band of depth this drawing lies in: a bigger city can widen it. */
  depthMid = DEPTH_MID;
  depthHalf = DEPTH_HALF;
  /** Seconds a stroke-by-stroke sketch takes, then the delay and length of the colour wipe. */
  sketchDur = 0.55;
  fillDelay = 0.5;
  fillDur = 0.5;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.fillP = program(gl, FILL_VS, fillFs(true));
    this.solidP = program(gl, FILL_VS, fillFs(false));
    this.lineP = program(gl, LINE_VS, LINE_FS);
    this.postP = program(gl, POST_VS, POST_FS);
    for (const n of ["uCam", "uHalf", "uDepth", "uTime", "uClock", "uNoise", "uReveal", "uNight"]) {
      this.uFill[n] = gl.getUniformLocation(this.fillP, n);
      this.uSolid[n] = gl.getUniformLocation(this.solidP, n);
    }
    for (const n of ["uCam", "uHalf", "uDepth", "uTime", "uClock", "uMinPx", "uReveal", "uSketch", "uNight", "uPaper", "uPass"]) {
      this.uLine[n] = gl.getUniformLocation(this.lineP, n);
    }
    for (const n of ["uNoise", "uPx", "uPaper", "uFade"]) this.uPost[n] = gl.getUniformLocation(this.postP, n);

    this.sFill = this.fillBatch();
    this.dFill = this.fillBatch();
    this.quad = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.sLine = this.lineBatch(this.quad);
    this.dLine = this.lineBatch(this.quad);
    this.postVao = gl.createVertexArray() as WebGLVertexArrayObject;

    const size = 256;
    this.noise = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseTexture(size));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  private fillBatch(): Batch {
    const gl = this.gl;
    const vao = gl.createVertexArray() as WebGLVertexArrayObject;
    gl.bindVertexArray(vao);
    const fbuf = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, fbuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, FV * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, FV * 4, 12);
    const cbuf = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, FC, 0);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, FC, 4);
    gl.bindVertexArray(null);
    return { vao, fbuf, cbuf, count: 0 };
  }

  private lineBatch(quad: WebGLBuffer): Batch {
    const gl = this.gl;
    const vao = gl.createVertexArray() as WebGLVertexArrayObject;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const fbuf = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, fbuf);
    const stride = LV * 4;
    const attr = (loc: number, size: number, off: number) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
      gl.vertexAttribDivisor(loc, 1);
    };
    attr(1, 3, 0);
    attr(2, 3, 12);
    attr(3, 4, 24);
    attr(4, 2, 40);
    const cbuf = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.UNSIGNED_BYTE, true, LC, 0);
    gl.vertexAttribDivisor(5, 1);
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 4, gl.UNSIGNED_BYTE, true, LC, 4);
    gl.vertexAttribDivisor(6, 1);
    gl.bindVertexArray(null);
    return { vao, fbuf, cbuf, count: 0 };
  }

  private upload(fill: Batch, line: Batch, m: Mesh, usage: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, fill.fbuf);
    gl.bufferData(gl.ARRAY_BUFFER, m.fv.subarray(0, m.fn * FV), usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, fill.cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, m.fc.subarray(0, m.fn * FC), usage);
    fill.count = m.fn;
    gl.bindBuffer(gl.ARRAY_BUFFER, line.fbuf);
    gl.bufferData(gl.ARRAY_BUFFER, m.lv.subarray(0, m.ln * LV), usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, line.cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, m.lc.subarray(0, m.ln * LC), usage);
    line.count = m.ln;
  }

  /** Hand the finished city to the GPU. Call again if the static mesh changes. */
  setStatic(m: Mesh): void {
    this.upload(this.sFill, this.sLine, m, this.gl.STATIC_DRAW);
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.dpr = dpr;
    this.width = Math.max(1, Math.round(cssW * dpr));
    this.height = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  draw(f: Frame): void {
    const gl = this.gl;
    const n = f.night;
    const paper: [number, number, number] = [
      PAPER_DAY[0] + (PAPER_NIGHT[0] - PAPER_DAY[0]) * n,
      PAPER_DAY[1] + (PAPER_NIGHT[1] - PAPER_DAY[1]) * n,
      PAPER_DAY[2] + (PAPER_NIGHT[2] - PAPER_DAY[2]) * n,
    ];
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(paper[0], paper[1], paper[2], 1);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noise);

    if (f.dyn) this.upload(this.dFill, this.dLine, f.dyn, gl.DYNAMIC_DRAW);
    else {
      this.dFill.count = 0;
      this.dLine.count = 0;
    }

    const zoom = f.zoom * this.dpr;
    const hx = this.width / 2;
    const hy = this.height / 2;

    gl.disable(gl.BLEND);
    let u = this.uFill;
    // the finished city without the wipe, anything still arriving with it
    for (const b of [this.sFill, this.dFill]) {
      if (b.count === 0) continue;
      const solid = b === this.sFill && f.settled;
      gl.useProgram(solid ? this.solidP : this.fillP);
      u = solid ? this.uSolid : this.uFill;
      gl.uniform3f(u.uCam, f.camX, f.camY, zoom);
      gl.uniform2f(u.uHalf, hx, hy);
      gl.uniform2f(u.uDepth, this.depthMid, 1 / this.depthHalf);
      gl.uniform1f(u.uTime, f.time);
      gl.uniform1f(u.uClock, f.clock);
      gl.uniform1i(u.uNoise, 0);
      gl.uniform2f(u.uReveal, this.fillDelay, this.fillDur);
      gl.uniform1f(u.uNight, n);
      gl.bindVertexArray(b.vao);
      gl.drawArrays(gl.TRIANGLES, 0, b.count);
    }

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.lineP);
    u = this.uLine;
    gl.uniform3f(u.uCam, f.camX, f.camY, zoom);
    gl.uniform2f(u.uHalf, hx, hy);
    gl.uniform2f(u.uDepth, this.depthMid, 1 / this.depthHalf);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uClock, f.clock);
    gl.uniform1f(u.uMinPx, 1.0);
    gl.uniform2f(u.uReveal, this.fillDelay, this.fillDur);
    gl.uniform1f(u.uSketch, this.sketchDur);
    gl.uniform1f(u.uNight, n);
    gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);
    // Strokes are soft-edged, so they cannot write depth as they are drawn (a
    // faint edge pixel would block the stroke that continues from it). First
    // lay down depth for their solid cores only, then draw the colour against
    // that without writing depth.
    gl.uniform1i(u.uPass, 0);
    gl.colorMask(false, false, false, false);
    for (const b of [this.sLine, this.dLine]) {
      if (b.count === 0) continue;
      gl.bindVertexArray(b.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.count);
    }
    gl.uniform1i(u.uPass, 1);
    gl.colorMask(true, true, true, true);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    for (const b of [this.sLine, this.dLine]) {
      if (b.count === 0) continue;
      gl.bindVertexArray(b.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.count);
    }

    // paper grain, vignette and the fade back to blank paper
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.SRC_ALPHA);
    gl.useProgram(this.postP);
    u = this.uPost;
    gl.uniform1i(u.uNoise, 0);
    gl.uniform2f(u.uPx, this.width / this.dpr, this.height / this.dpr);
    gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);
    gl.uniform1f(u.uFade, f.fade);
    gl.bindVertexArray(this.postVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    for (const b of [this.sFill, this.sLine, this.dFill, this.dLine]) {
      gl.deleteBuffer(b.fbuf);
      gl.deleteBuffer(b.cbuf);
      gl.deleteVertexArray(b.vao);
    }
    gl.deleteBuffer(this.quad);
    gl.deleteVertexArray(this.postVao);
    gl.deleteTexture(this.noise);
    gl.deleteProgram(this.fillP);
    gl.deleteProgram(this.solidP);
    gl.deleteProgram(this.lineP);
    gl.deleteProgram(this.postP);
  }
}
