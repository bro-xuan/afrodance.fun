/**
 * Tiny dependency-free SVG chart helpers shared by the cycle charts.
 * Log-scale y, linear x, "nice" tick generation, and number formatting.
 */

export interface Scale {
  (v: number): number;
  domain: [number, number];
  range: [number, number];
}

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = ((v: number) => r0 + (v - d0) * k) as Scale;
  f.domain = domain;
  f.range = range;
  return f;
}

export function logScale(domain: [number, number], range: [number, number]): Scale {
  const l0 = Math.log10(domain[0]);
  const l1 = Math.log10(domain[1]);
  const [r0, r1] = range;
  const k = (r1 - r0) / (l1 - l0 || 1);
  const f = ((v: number) => r0 + (Math.log10(v) - l0) * k) as Scale;
  f.domain = domain;
  f.range = range;
  return f;
}

/** 1-2-5 ticks on a log axis between lo and hi (inclusive-ish). */
export function logTicks(lo: number, hi: number, mantissas: number[] = [1, 2, 5]): number[] {
  const out: number[] = [];
  const e0 = Math.floor(Math.log10(lo));
  const e1 = Math.ceil(Math.log10(hi));
  for (let e = e0; e <= e1; e++) {
    for (const m of mantissas) {
      const v = m * 10 ** e;
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
    }
  }
  return out;
}

/** Evenly spaced linear ticks with a nice step. */
export function linearTicks(lo: number, hi: number, count = 6): number[] {
  const span = hi - lo;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** SVG path for a polyline; `null` y-values break the line. */
export function linePath(pts: Array<[number, number] | null>): string {
  let d = "";
  let pen = false;
  for (const p of pts) {
    if (!p || !Number.isFinite(p[1])) { pen = false; continue; }
    d += `${pen ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** Closed area between an upper and lower polyline (same x positions). */
export function bandPath(upper: Array<[number, number] | null>, lower: Array<[number, number] | null>): string {
  const segs: string[] = [];
  let up: [number, number][] = [];
  let lo: [number, number][] = [];
  const flush = () => {
    if (up.length > 1) {
      const fwd = up.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
      const back = [...lo].reverse().map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
      segs.push(fwd + back + "Z");
    }
    up = []; lo = [];
  };
  for (let i = 0; i < upper.length; i++) {
    const u = upper[i], l = lower[i];
    if (!u || !l) { flush(); continue; }
    up.push(u); lo.push(l);
  }
  flush();
  return segs.join("");
}

const trim0 = (s: string) => s.replace(/\.0+$/, "");

export function fmtUsd(v: number): string {
  if (v >= 1e6) return `$${trim0((v / 1e6).toFixed(2))}M`;
  if (v >= 1e3) return `$${trim0((v / 1e3).toFixed(v >= 1e4 ? 1 : 2))}k`;
  if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v)}`;
  return `$${v.toFixed(2)}`;
}

export function fmtUsdFull(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v < 100 ? 2 : 0 });
}

export function fmtMultiple(v: number): string {
  if (v >= 10) return `${Math.round(v)}×`;
  if (Number.isInteger(v)) return `${v}×`;
  return `${v.toFixed(2)}×`;
}

export function fmtPct(v: number, digits = 0): string {
  const s = (v * 100).toFixed(digits);
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Chart chrome tokens (dark surface #121a2b). Text never wears series color. */
export const CHART = {
  surface: "#121a2b",
  grid: "#1e2939",
  axis: "#2a3648",
  textPrimary: "#dfe7f1",
  textSecondary: "#8695ac",
  textMuted: "#5c6a83",
  /** Categorical slots validated all-pairs on the dark surface (dataviz palette). */
  series: ["#3987e5", "#d95926", "#199e70"] as const,
  /** Emphasis line for "now" — distinguished by weight + direct label, not hue. */
  current: "#f2f6fb",
} as const;

/** Value of a sampled series at an arbitrary day (nearest sample). */
export function sampledAt(arr: number[], step: number, day: number): number {
  const i = Math.min(arr.length - 1, Math.max(0, Math.round(day / step)));
  return arr[i];
}

/**
 * Push label y-positions apart to >= gap px, preserving order. Returns the
 * adjusted positions; a leader line is warranted where |adjusted - y| > 2.
 */
export function spreadLabels(ys: number[], gap = 13): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = order.map(([y]) => y);
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap);
  const res = new Array(ys.length).fill(0);
  order.forEach(([, idx], k) => { res[idx] = out[k]; });
  return res;
}

/** Log-log regression trend value (USD) on a given ISO date. */
export function regressionPrice(
  reg: { a: number; b: number; genesis: string }, iso: string, offsetLog10 = 0,
): number {
  const days = (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${reg.genesis}T00:00:00Z`)) / 86_400_000;
  return 10 ** (reg.a + reg.b * Math.log10(Math.max(1, days)) + offsetLog10);
}
