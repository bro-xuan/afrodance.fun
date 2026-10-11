// Number formatting + the dashboard's color tokens (validated with the dataviz
// palette checker: long/short pair clears CVD ΔE 9.4; venue trio clears 24.7).

export const C = {
  ink: "#0b0b0b",
  ink2: "#4a4a46",
  muted: "#6b6a65",
  line: "#e7e6e1",
  grid: "#efeee9",
  surface: "#ffffff",
  page: "#f7f7f4",
  long: "#0a9a7a", // longs / inflows / up
  short: "#e0473f", // shorts / outflows / down
  longInk: "#06735b",
  shortInk: "#b8322b",
  accent: "#ff4f00",
  venues: { binance: "#2a78d6", bybit: "#eb6834", okx: "#4a3aa7" },
  neutral: "#9a9890",
};

export function usd(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(digits)}K`;
  return `${s}$${a.toFixed(0)}`;
}

export const price = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "n/a"
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const pct = (n: number | null | undefined, digits = 2, signed = true) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  // Round first so a tiny negative never prints as "−0.00%".
  const r = Number(n.toFixed(digits));
  return `${signed && r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(digits)}%`;
};

export const fixed = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "n/a" : n.toFixed(digits);

/** Signed US$ millions as used by ETF flow tables: +189.9M / −484.9M */
export const flowM = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "n/a"
    : `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.abs(n) >= 1000 ? `${(Math.abs(n) / 1000).toFixed(2)}B` : `${Math.abs(n).toFixed(1)}M`}`;

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function countdown(t: number, now = Date.now()): string {
  const s = Math.round((t - now) / 1000);
  if (s <= 0) return s > -3 * 3600 ? "live / just out" : "passed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m ${s % 60}s`;
}

export const tone = (n: number | null | undefined) =>
  n === null || n === undefined || n === 0 ? C.ink2 : n > 0 ? C.longInk : C.shortInk;

// Viewer-local time (the browser's own zone, e.g. CEST for Amsterdam).
export const localTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const localDay = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const tzLabel = (t = Date.now()) =>
  new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(new Date(t)).find((p) => p.type === "timeZoneName")?.value ?? "local";
