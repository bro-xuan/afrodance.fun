/**
 * Dealer gamma from Deribit open interest, the standard naive way: assume
 * dealers are long the calls and short the puts customers hold (customers
 * buy puts for protection and sell calls for yield). Net gamma positive =
 * dealers hedge against the move (buy dips, sell rips), so price pins; net
 * negative = they hedge with it, so moves extend. The flip is where it
 * changes sign; the walls are the strikes with the most gamma on each side.
 * Positioning is assumed, not observed: read it as a map, not a fact.
 */

export type OptLeg = { k: number; iv: number; call: boolean; oi: number; T: number }; // oi in BTC, T in years, iv in %

export type GammaLevels = {
  flip: number | null; // spot where net dealer gamma crosses zero, nearest to spot
  callWall: number | null; // strike with the most call gamma: resistance
  putWall: number | null; // strike with the most put gamma: support
  netAtSpot: number; // $ of delta dealers trade per 1% move at spot (+ = dampening)
};

const SQRT2PI = Math.sqrt(2 * Math.PI);

function gamma(S: number, k: number, T: number, iv: number) {
  const sd = (iv / 100) * Math.sqrt(T);
  if (sd <= 0) return 0;
  const d1 = (Math.log(S / k) + 0.5 * sd * sd) / sd;
  return Math.exp(-0.5 * d1 * d1) / SQRT2PI / (S * sd);
}

/** Net dealer gamma in $ per 1% move if spot were at S. */
export function netGamma(legs: OptLeg[], S: number) {
  return legs.reduce((s, l) => s + (l.call ? 1 : -1) * l.oi * gamma(S, l.k, l.T, l.iv) * S * S * 0.01, 0);
}

export function gammaLevels(all: OptLeg[], spot: number, maxDays = 60): GammaLevels | null {
  // Gamma is a near-dated thing: far expiries barely move with spot.
  const legs = all.filter((l) => l.oi > 0 && l.T > 0.5 / 365 && l.T <= maxDays / 365 && l.iv > 0);
  if (!legs.length) return null;

  const grid = Array.from({ length: 161 }, (_, i) => spot * (0.8 + i * 0.0025));
  const g = grid.map((S) => netGamma(legs, S));
  let flip: number | null = null;
  for (let i = 0; i < grid.length - 1; i++) {
    if (Math.sign(g[i]) !== Math.sign(g[i + 1]) && g[i] !== 0) {
      // Linear interpolation between grid points; keep the crossing nearest spot.
      const x = grid[i] + (g[i] / (g[i] - g[i + 1])) * (grid[i + 1] - grid[i]);
      if (flip === null || Math.abs(x - spot) < Math.abs(flip - spot)) flip = x;
    }
  }

  const byStrike = (call: boolean) => {
    const m = new Map<number, number>();
    for (const l of legs) if (l.call === call) m.set(l.k, (m.get(l.k) ?? 0) + l.oi * gamma(spot, l.k, l.T, l.iv));
    let best: number | null = null;
    let bv = 0;
    for (const [k, v] of m) {
      const side = call ? k >= spot : k <= spot; // walls sit on their own side of spot
      if (side && v > bv) [best, bv] = [k, v];
    }
    return best;
  };

  return { flip, callWall: byStrike(true), putWall: byStrike(false), netAtSpot: netGamma(legs, spot) };
}
