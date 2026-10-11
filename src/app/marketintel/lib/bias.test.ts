import { describe, expect, it } from "vitest";
import { checkTrade, type CheckInputs } from "./bias";
import type { Level } from "./quant";
import type { Signal } from "./signals";
import type { MarketEvent } from "./types";

const now = Date.UTC(2026, 9, 11, 20);
const lvl = (key: string, label: string, p: number, kind: Level["kind"] = "session"): Level => ({ key, label, price: p, kind, note: "" });
const sig = (key: string, score: number, w: Signal["w"]): Signal => ({
  key, label: key, kind: "Flow", contrarian: false, value: "", read: "", score, w, lean: score >= 0.2 ? "bull" : score <= -0.2 ? "bear" : "neutral",
});
// Spot 84,000. DVOL 40 → 1σ day ≈ $1,759, 1σ week ≈ $4,653.
const levels = [
  lvl("7dh", "7 day high", 87_000), lvl("liqu", "Short liq cluster", 85_900, "liq"), lvl("s1u", "+1σ today", 85_700, "vol"),
  lvl("pdh", "Prev. day high", 84_200), // too close to matter for a swing
  lvl("pdl", "Prev. day low", 82_500), lvl("liqd", "Long liq cluster", 81_000, "liq"), lvl("7dl", "7 day low", 80_400),
];
const base = (o: Partial<CheckInputs> = {}): CheckInputs => ({
  side: "long", horizon: "swing", entry: 84_000, levels, dvol: 40, events: [], now,
  signals: [sig("etf", 0.6, { swing: 1 }), sig("trend", 0.5, { swing: 1.25 }), sig("skew", -0.4, { swing: 0.75 }), sig("tape", 0.9, { intraday: 1 })],
  ...o,
});

describe("checkTrade", () => {
  it("backs a long when the swing pulse is bullish, and splits the evidence", () => {
    const r = checkTrade(base());
    expect(r.tone).toBe("for");
    expect(r.pro.map((s) => s.key)).toEqual(["trend", "etf"]);
    expect(r.con.map((s) => s.key)).toEqual(["skew"]);
    expect(r.pro.map((s) => s.key)).not.toContain("tape"); // intraday-only read
  });

  it("flips the verdict for the same pulse on a short", () => {
    const r = checkTrade(base({ side: "short" }));
    expect(r.tone).toBe("against");
    expect(r.aligned!).toBeLessThan(0);
    expect(r.warnings.some((w) => /against the swing pulse/.test(w))).toBe(true);
  });

  it("puts the stop beyond the nearest real level and skips noise and σ lines", () => {
    const r = checkTrade(base());
    // Prev. day low at 82,500 is the first support past a quarter σ (~$1,163); stop sits a buffer below it.
    expect(r.stop!.label).toMatch(/prev\. day low/);
    expect(r.stop!.price).toBeLessThan(82_500);
    expect(r.stop!.price).toBeGreaterThan(81_900);
    // Targets skip the 84,200 level (inside the noise band) and the +1σ line.
    expect(r.targets.map((t) => t.label)).toEqual(["Short liq cluster", "7 day high"]);
    expect(r.rr!).toBeGreaterThan(0.5);
    expect(r.breakeven!).toBeCloseTo(1 / (1 + r.rr!), 10);
  });

  it("mirrors levels for a short", () => {
    const r = checkTrade(base({ side: "short" }));
    expect(r.stop!.label).toMatch(/short liq cluster/);
    expect(r.stop!.price).toBeGreaterThan(85_900);
    expect(r.targets[0].label).toBe("Prev. day low");
  });

  it("flags a liquidation pool between entry and stop", () => {
    const r = checkTrade(base({ levels: levels.filter((l) => l.key !== "pdl") }));
    // Stop now sits beyond the long liq cluster itself, so no pool between: check with a deeper stop.
    expect(r.stop!.label).toMatch(/long liq cluster/);
    expect(r.warnings.some((w) => /sits just past the long liq cluster/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /sits between entry and stop/.test(w))).toBe(false);
    const deeper = checkTrade(base({ levels: [...levels.filter((l) => l.key !== "pdl" && l.key !== "7dl"), lvl("x", "Support", 81_500)] }));
    expect(deeper.stop!.label).toMatch(/support/);
    expect(deeper.warnings.some((w) => /Long liq cluster/.test(w))).toBe(false);
    const wide = checkTrade(base({ horizon: "macro", levels: [lvl("liqd", "Long liq cluster", 83_000, "liq"), lvl("w", "Weekly low", 76_000), lvl("h", "High", 95_000)] }));
    expect(wide.stop!.label).toMatch(/weekly low/);
    expect(wide.warnings.some((w) => /Long liq cluster at \$83,000 sits between/.test(w))).toBe(true);
  });

  it("warns on a stop inside half a day's move and on reward under risk", () => {
    const tight = [lvl("a", "Support", 83_400), lvl("b", "Resistance", 84_500)]; // both just past a quarter σ of a day
    const r = checkTrade(base({ horizon: "intraday", levels: tight }));
    expect(r.warnings.some((w) => /half a normal day/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /smaller than the risk/.test(w))).toBe(true);
  });

  it("falls back to 1σ when no level is in range, and returns options odds", () => {
    const r = checkTrade(base({ levels: [] }));
    expect(r.stop!.label).toBe("1σ for the horizon");
    expect(r.targets[0].label).toBe("1σ for the horizon");
    expect(r.rr).toBeCloseTo(1, 5);
    expect(r.pTarget!).toBeGreaterThan(0.2);
    expect(r.pTarget!).toBeLessThan(0.5); // touch odds of a 1σ barrier ≈ 32%
  });

  it("lists high-impact catalysts inside the horizon only", () => {
    const ev = (title: string, hours: number, impact: MarketEvent["impact"] = "high"): MarketEvent => ({
      id: title, title, t: now + hours * 3_600_000, category: "inflation", impact, source: "",
    });
    const events = [ev("CPI", 40), ev("Claims", 30, "medium"), ev("FOMC", 24 * 17), ev("Past", -5)];
    const grouped = checkTrade(base({ events: [ev("CPI m/m", 40), ev("CPI y/y", 40), ev("Core CPI", 40)] }));
    expect(grouped.catalysts.map((e) => e.title)).toEqual(["CPI m/m + 2 more"]);
    expect(checkTrade(base({ events })).catalysts.map((e) => e.title)).toEqual(["CPI"]);
    expect(checkTrade(base({ events, horizon: "macro" })).catalysts.map((e) => e.title)).toEqual(["CPI", "FOMC"]);
    const intra = checkTrade(base({ events: [ev("CPI", 10)], horizon: "intraday" }));
    expect(intra.warnings.some((w) => /CPI lands inside this window/.test(w))).toBe(true);
  });

  it("warns when the stop is more likely than not to be touched within the horizon", () => {
    const r = checkTrade(base()); // swing stop ~1.9% away vs a ~5.5% weekly σ
    expect(r.pStop!).toBeGreaterThan(0.6);
    expect(r.warnings.some((w) => /chance the stop gets touched/.test(w))).toBe(true);
    const wide = checkTrade(base({ horizon: "intraday", levels: [lvl("a", "Support", 81_000), lvl("b", "High", 87_000)] }));
    expect(wide.warnings.some((w) => /chance the stop gets touched/.test(w))).toBe(false);
  });

  it("waits for data when the horizon has no reads", () => {
    const r = checkTrade(base({ signals: [], dvol: null, levels: [] }));
    expect(r.aligned).toBeNull();
    expect(r.verdict).toBe("Waiting for data");
    expect(r.stop).toBeNull();
    expect(r.rr).toBeNull();
  });
});
