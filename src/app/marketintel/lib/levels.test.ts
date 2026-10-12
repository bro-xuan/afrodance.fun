import { describe, expect, it } from "vitest";
import { cmeGap, prevWeek, volumeProfile, vwapSince, type Bar } from "./levels";
import type { Candle } from "./types";

const H = 3_600_000;
const DAY = 24 * H;
const c = (t: number, p: number, v = 1): Candle => ({ t, o: p, h: p + 50, l: p - 50, c: p, v, delta: 0 });

describe("vwapSince", () => {
  it("weights by volume and ignores bars before the anchor", () => {
    const xs = [c(0, 1000, 100), c(H, 2000, 1), c(2 * H, 3000, 1)];
    expect(vwapSince(xs, H)).toBeCloseTo(2500);
    expect(vwapSince(xs, 0)!).toBeLessThan(1100);
    expect(vwapSince(xs, 3 * H)).toBeNull();
  });
});

describe("volumeProfile", () => {
  it("puts the POC at the busiest price and the value area around it", () => {
    const xs = [
      ...Array.from({ length: 30 }, (_, i) => c(i * H, 84_000, 10)),
      ...Array.from({ length: 5 }, (_, i) => c((30 + i) * H, 80_000, 1)),
      ...Array.from({ length: 5 }, (_, i) => c((35 + i) * H, 88_000, 1)),
    ];
    const p = volumeProfile(xs, 100)!;
    expect(Math.abs(p.poc - 84_000)).toBeLessThan(100);
    expect(p.val).toBeLessThanOrEqual(84_000);
    expect(p.vah).toBeGreaterThanOrEqual(84_000);
    expect(p.vah - p.val).toBeLessThan(1000); // the outliers stay outside 70%
  });
});

describe("prevWeek", () => {
  it("takes the high and low of the seven days before the week start", () => {
    const ws = 14 * DAY;
    const daily = Array.from({ length: 21 }, (_, i) => c(i * DAY, i === 9 ? 90_000 : i === 16 ? 99_000 : 80_000 + i));
    expect(prevWeek(daily, ws)).toEqual({ h: 90_050, l: 80_007 - 50 });
  });
});

describe("cmeGap", () => {
  const bar = (t: number, o: number, h: number, l: number, cl: number): Bar => ({ t, o, h, l, c: cl });
  const fri = 100 * DAY;
  it("finds an unfilled weekend gap and the CME basis", () => {
    const bars = [bar(fri - H, 80_000, 80_100, 79_900, 80_000), bar(fri + 2 * DAY, 82_000, 82_500, 81_500, 82_200), bar(fri + 2 * DAY + H, 82_200, 83_000, 82_000, 82_800)];
    const g = cmeGap(bars, () => 82_400)!;
    expect(g.close).toBe(80_000);
    expect(g.reopen).toBe(82_000);
    expect(g.basis).toBeCloseTo(82_800 / 82_400 - 1);
  });
  it("skips a gap once price trades back through the Friday close", () => {
    const bars = [bar(fri - H, 80_000, 80_100, 79_900, 80_000), bar(fri + 2 * DAY, 82_000, 82_500, 81_500, 82_200), bar(fri + 2 * DAY + H, 82_000, 82_000, 79_800, 80_500)];
    expect(cmeGap(bars, () => 80_400)).toBeNull();
  });
  it("ignores the daily maintenance break", () => {
    const bars = [bar(0, 80_000, 80_100, 79_900, 80_000), bar(2 * H, 81_000, 81_100, 80_900, 81_000)];
    expect(cmeGap(bars, () => 81_000)).toBeNull();
  });
  it("gives up without a spot price for the CME hour", () => {
    const bars = [bar(fri - H, 80_000, 80_100, 79_900, 80_000), bar(fri + 2 * DAY, 82_000, 82_500, 81_500, 82_200)];
    expect(cmeGap(bars, () => null)).toBeNull();
  });
});
