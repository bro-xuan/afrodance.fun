import { describe, expect, it } from "vitest";
import { ordinal, percentileRank } from "./quant";

describe("percentileRank", () => {
  const xs = Array.from({ length: 100 }, (_, i) => i);
  it("ranks a value within its history", () => {
    expect(percentileRank(xs, 89.5)).toBeCloseTo(0.9);
    expect(percentileRank(xs, -1)).toBe(0);
    expect(percentileRank(xs, 1000)).toBe(1);
  });
  it("needs at least 10 points", () => {
    expect(percentileRank([1, 2, 3], 2)).toBeNull();
  });
});

describe("ordinal", () => {
  it.each([[0.01, "1st"], [0.02, "2nd"], [0.03, "3rd"], [0.11, "11th"], [0.12, "12th"], [0.13, "13th"], [0.21, "21st"], [0.93, "93rd"], [1, "100th"]])("%s → %s", (p, s) => {
    expect(ordinal(p)).toBe(s);
  });
});
