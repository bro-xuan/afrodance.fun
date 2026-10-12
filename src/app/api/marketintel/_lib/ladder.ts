import type { PolyRung } from "@/app/marketintel/lib/types";

/**
 * Odds must fall as the strike moves away from spot: P(above) and P(hit up)
 * drop as the strike rises, P(hit down) rises with it. A rung that breaks
 * that is a stale quote in a thin market (a $74K "above" at 53% under a $78K
 * at 94%), so drop it. Stale quotes go first: a firm quote from a tight book
 * is only dropped once no stale rung is left in conflict, so a few stale
 * rungs agreeing with each other can't outvote a real move.
 */
export function dropStale(r: (PolyRung & { firm: boolean })[]): PolyRung[] {
  const ordered = (a: PolyRung, b: PolyRung) => // a.strike < b.strike, same dir
    a.dir === "down" ? a.p <= b.p + 0.02 : a.p + 0.02 >= b.p;
  let xs = r;
  for (let pass = 0; pass < r.length; pass++) {
    const bad = xs.map((x) =>
      xs.filter((y) => y !== x && y.dir === x.dir && !(x.strike < y.strike ? ordered(x, y) : ordered(y, x))).length,
    );
    const pick = (firm: boolean) => {
      let best = -1;
      xs.forEach((x, j) => x.firm === firm && bad[j] > 0 && (best < 0 || bad[j] > bad[best]) && (best = j));
      return best;
    };
    const i = pick(false) >= 0 ? pick(false) : pick(true);
    if (i < 0) break;
    xs = xs.filter((_, j) => j !== i);
  }
  return xs.map((x) => ({ strike: x.strike, dir: x.dir, p: x.p, question: x.question }));
}
