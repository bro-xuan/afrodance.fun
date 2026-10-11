import { describe, expect, it } from "vitest";
import { gammaLevels, netGamma, type OptLeg } from "./gamma";

const leg = (k: number, call: boolean, oi: number, days = 20, iv = 40): OptLeg => ({ k, call, oi, iv, T: days / 365 });

describe("gammaLevels", () => {
  it("finds the walls on their own side of spot", () => {
    const legs = [leg(90_000, true, 1000), leg(86_000, true, 1000), leg(80_000, true, 9000), leg(76_000, false, 1000), leg(80_000, false, 1000), leg(88_000, false, 9000)];
    const g = gammaLevels(legs, 84_000)!;
    // Equal OI: the strike nearer spot carries more gamma. Big in-the-money strikes don't count as walls.
    expect(g.callWall).toBe(86_000);
    expect(g.putWall).toBe(80_000);
    // Enough OI further out outweighs proximity.
    expect(gammaLevels([leg(90_000, true, 8000), leg(86_000, true, 1000)], 84_000)!.callWall).toBe(90_000);
  });

  it("puts the flip between heavy put strikes below and heavy call strikes above", () => {
    const legs = [leg(78_000, false, 6000), leg(80_000, false, 6000), leg(88_000, true, 6000), leg(90_000, true, 6000)];
    const g = gammaLevels(legs, 84_000)!;
    expect(g.flip!).toBeGreaterThan(80_000);
    expect(g.flip!).toBeLessThan(88_000);
    expect(netGamma(legs, g.flip! - 500)).toBeLessThan(0);
    expect(netGamma(legs, g.flip! + 500)).toBeGreaterThan(0);
  });

  it("ignores expired and far-dated options", () => {
    expect(gammaLevels([leg(84_000, true, 1000, 0.1), leg(84_000, true, 1000, 200)], 84_000)).toBeNull();
  });

  it("has no flip when every leg is a call", () => {
    expect(gammaLevels([leg(84_000, true, 1000), leg(88_000, true, 1000)], 84_000)!.flip).toBeNull();
  });
});
