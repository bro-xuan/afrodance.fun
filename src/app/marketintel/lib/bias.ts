import { price } from "./format";
import { sigmaMove, touchProb, type Level } from "./quant";
import { composite, NO_EDGE, type Horizon, type Signal } from "./signals";
import type { MarketEvent } from "./types";

/**
 * "Check a trade": point the pulse at one trade. Given a side, a horizon and
 * an entry, list the reads for and against it, place a stop beyond the
 * nearest real level against it and targets at the next levels in its favour,
 * and say what the options market thinks of those distances. The levels are
 * the same ones on the chart; nothing here is a recommendation.
 */

export type Side = "long" | "short";

/** Calendar days each horizon looks ahead: for expected moves, odds and catalysts. */
export const HORIZON_DAYS: Record<Horizon, number> = { intraday: 1, swing: 7, macro: 30 };

export type PlanLevel = { label: string; price: number; dist: number }; // dist: % from entry, signed

export type TradeCheck = {
  aligned: number | null; // the horizon's net bias, flipped so + means "in your favour"
  verdict: string;
  tone: "for" | "against" | "neutral";
  agree: number | null;
  reads: number;
  pro: Signal[]; // reads backing the trade, strongest first
  con: Signal[]; // reads against it
  sigma: number | null; // 1σ $ move over the horizon, from DVOL
  stop: PlanLevel | null;
  targets: PlanLevel[];
  rr: number | null; // first target's reward over the stop's risk
  breakeven: number | null; // win rate needed to break even at that R:R
  pTarget: number | null; // odds price touches the first target within the horizon
  pStop: number | null; // odds price touches the stop within the horizon
  warnings: string[];
  catalysts: MarketEvent[];
};

export type CheckInputs = {
  side: Side;
  horizon: Horizon;
  entry: number;
  signals: Signal[];
  levels: Level[];
  dvol: number | null;
  events: MarketEvent[];
  now?: number;
};

const DAY = 86_400_000;

function verdictOf(a: number, side: Side): { verdict: string; tone: TradeCheck["tone"] } {
  if (a >= 20) return { verdict: `The pulse backs this ${side}`, tone: "for" };
  if (a >= NO_EDGE) return { verdict: "The pulse leans your way", tone: "for" };
  if (a > -NO_EDGE) return { verdict: "No edge either way: it's your call", tone: "neutral" };
  if (a > -20) return { verdict: "The pulse leans against you", tone: "against" };
  return { verdict: `The pulse is against this ${side}`, tone: "against" };
}

export function checkTrade({ side, horizon, entry, signals, levels, dvol, events, now = Date.now() }: CheckInputs): TradeCheck {
  const dir = side === "long" ? 1 : -1;
  const days = HORIZON_DAYS[horizon];
  const c = composite(signals, horizon);
  const aligned = c ? c.net * dir : null;
  const { verdict, tone } = aligned === null ? { verdict: "Waiting for data", tone: "neutral" as const } : verdictOf(aligned, side);

  const weight = (s: Signal) => s.w[horizon] ?? 0;
  const ranked = signals
    .filter((s) => weight(s) > 0 && s.lean !== "neutral")
    .sort((a, b) => Math.abs(b.score * weight(b)) - Math.abs(a.score * weight(a)));
  const pro = ranked.filter((s) => s.score * dir > 0);
  const con = ranked.filter((s) => s.score * dir < 0);

  const sigma = dvol ? sigmaMove(entry, dvol, days) : null;
  const dayMove = dvol ? sigmaMove(entry, dvol, 1) : null;
  // Levels closer than a quarter σ are noise for this horizon: a stop there
  // gets wicked, a target there isn't worth the trade.
  const minGap = sigma ? sigma * 0.25 : entry * 0.003;
  const reach = sigma ? sigma * 3 : entry * 0.15;
  const buffer = Math.max(sigma ? sigma * 0.1 : 0, entry * 0.001); // levels get swept: sit beyond them
  const plan = (label: string, p: number): PlanLevel => ({ label, price: p, dist: (p / entry - 1) * 100 });

  // ±1σ lines are statistics, not levels anyone defends; keep them out.
  const structural = levels.filter((l) => l.kind !== "vol");
  const away = (l: Level) => (l.price - entry) * dir; // + in the trade's favour
  const against = structural.filter((l) => -away(l) >= minGap && -away(l) <= reach).sort((a, b) => away(b) - away(a));
  const favour = structural.filter((l) => away(l) >= minGap && away(l) <= reach).sort((a, b) => away(a) - away(b));

  const stopAt = against[0];
  const stop = stopAt
    ? plan(`Beyond ${stopAt.label.toLowerCase()} (${price(stopAt.price)})`, stopAt.price - dir * buffer)
    : sigma ? plan(`1σ for the horizon`, entry - dir * sigma) : null;
  const targets = favour.slice(0, 2).map((l) => plan(l.label, l.price));
  if (!targets.length && sigma) targets.push(plan("1σ for the horizon", entry + dir * sigma));

  const t1 = targets[0];
  const risk = stop ? Math.abs(entry - stop.price) : null;
  const rr = t1 && risk ? Math.abs(t1.price - entry) / risk : null;

  const warnings: string[] = [];
  if (stop && dayMove && Math.abs(entry - stop.price) < dayMove * 0.5) {
    warnings.push(`Stop is ${price(Math.abs(entry - stop.price))} away, under half a normal day's move (${price(dayMove)}): easy to get wicked out.`);
  }
  if (rr !== null && rr < 1) warnings.push(`Reward to the first target is smaller than the risk (${rr.toFixed(1)}R).`);
  if (stop) {
    // A liquidation pool between entry and stop: if price reaches it, the
    // forced orders push straight on toward the stop.
    const pool = levels.find((l) => l.key === (side === "long" ? "liqd" : "liqu"));
    if (pool && pool === stopAt) {
      warnings.push(`Stop sits just past the ${pool.label.toLowerCase()}: sweeps of a liquidation pool usually overshoot it, so give it room or size down.`);
    } else if (pool && (pool.price - stop.price) * dir > 0 && (entry - pool.price) * dir > 0) {
      warnings.push(`${pool.label} at ${price(pool.price)} sits between entry and stop: a sweep there can cascade into your stop.`);
    }
  }
  if (aligned !== null && aligned <= -NO_EDGE) warnings.push(`You'd be trading against the ${horizon} pulse (${aligned > 0 ? "+" : "−"}${Math.abs(aligned).toFixed(0)}).`);

  // Releases that print together (CPI m/m, y/y, core…) are one market event.
  const inWindow = events.filter((e) => e.impact === "high" && e.t > now && e.t <= now + days * DAY).sort((a, b) => a.t - b.t);
  const catalysts: MarketEvent[] = [];
  for (const e of inWindow) {
    const same = inWindow.filter((x) => x.t === e.t);
    if (same[0] !== e) continue;
    catalysts.push(same.length > 1 ? { ...e, title: `${e.title} + ${same.length - 1} more` } : e);
    if (catalysts.length === 4) break;
  }
  if (catalysts.length && horizon === "intraday") {
    warnings.push(`${catalysts[0].title} lands inside this window. Event candles often run past 1σ.`);
  }

  const pStop = stop && dvol ? touchProb(entry, stop.price, dvol, days) : null;
  if (pStop !== null && pStop >= 0.6) {
    warnings.push(`Options price a ${(pStop * 100).toFixed(0)}% chance the stop gets touched within the ${horizon === "intraday" ? "day" : "horizon"}: widen it or size down.`);
  }

  return {
    aligned,
    verdict,
    tone,
    agree: c?.agree ?? null,
    reads: c?.count ?? 0,
    pro,
    con,
    sigma,
    stop,
    targets,
    rr,
    breakeven: rr !== null ? 1 / (1 + rr) : null,
    pTarget: t1 && dvol ? touchProb(entry, t1.price, dvol, days) : null,
    pStop,
    warnings,
    catalysts,
  };
}
