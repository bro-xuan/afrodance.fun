export const BASE = "/bottom_indicator";

export const SECTIONS = [
  { href: BASE, label: "Overview", blurb: "The cycle score, verdict and bottom / top watch panels." },
  { href: `${BASE}/signals`, label: "Signals", blurb: "Every on-chain, miner and price signal, ranked 0–100 against its own history." },
  { href: `${BASE}/cycle`, label: "Cycle timing", blurb: "4-year cycle overlay, drawdown from ATH and monthly seasonality." },
  { href: `${BASE}/valuation`, label: "Valuation", blurb: "Regression bands, 200-week SMA, 2-year MA multiplier and score-colored price." },
] as const;
