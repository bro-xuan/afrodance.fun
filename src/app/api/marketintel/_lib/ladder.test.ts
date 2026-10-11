import { describe, expect, it } from "vitest";
import type { PolyRung } from "@/app/marketintel/lib/types";
import { dropStale } from "./ladder";

const rung = (strike: number, p: number, dir: PolyRung["dir"] = "above", firm = true) => ({ strike, dir, p, firm, question: "" });
const strikes = (r: PolyRung[]) => r.map((x) => x.strike);

describe("dropStale", () => {
  it("drops the stale $74K rung that sat at 53% under a $78K at 94%", () => {
    const ladder = [
      rung(74000, 0.53, "above", false),
      rung(76000, 0.97), rung(78000, 0.94), rung(80000, 0.86), rung(82000, 0.69),
      rung(84000, 0.46), rung(86000, 0.26), rung(88000, 0.12), rung(90000, 0.05),
    ];
    expect(strikes(dropStale(ladder))).toEqual([76000, 78000, 80000, 82000, 84000, 86000, 88000, 90000]);
  });

  it("leaves a clean ladder alone and tolerates 2-point noise", () => {
    const ladder = [rung(80000, 0.9), rung(82000, 0.91), rung(84000, 0.5), rung(86000, 0.1)];
    expect(dropStale(ladder)).toHaveLength(4);
  });

  it("prefers dropping the stale quote when a firm and a stale one conflict", () => {
    const ladder = [rung(80000, 0.4, "above", true), rung(82000, 0.6, "above", false)];
    expect(strikes(dropStale(ladder))).toEqual([80000]);
  });

  it("keeps firm quotes that reflect a real move even when stale rungs outnumber them", () => {
    // Price ran up: firm books at 82K/84K moved, three stale rungs still show the old curve.
    const ladder = [
      rung(80000, 0.6, "above", false), rung(82000, 0.9), rung(84000, 0.85),
      rung(86000, 0.5, "above", false), rung(88000, 0.3, "above", false),
    ];
    const kept = dropStale(ladder);
    expect(strikes(kept)).toContain(82000);
    expect(strikes(kept)).toContain(84000);
  });

  it("checks touch ladders in their own direction", () => {
    const ladder = [
      // hit-down odds rise toward spot (higher strike)
      rung(70000, 0.08, "down"), rung(75000, 0.6, "down", false), rung(77500, 0.33, "down"), rung(80000, 0.56, "down"),
      // hit-up odds fall away from spot
      rung(85000, 0.82, "up"), rung(90000, 0.38, "up"),
    ];
    expect(strikes(dropStale(ladder))).toEqual([70000, 77500, 80000, 85000, 90000]);
  });

  it("strips the internal firm flag", () => {
    expect(dropStale([rung(80000, 0.5)])[0]).not.toHaveProperty("firm");
  });
});
