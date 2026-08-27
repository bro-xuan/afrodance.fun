import type { ScoreHistory } from "../types";

/**
 * Aggregate per-metric weekly score histories into one 0–100 series aligned
 * to `dates` — the same "average of two-sided signals" as the headline gauge,
 * evaluated on each past week with today's full-history ranking. Metrics that
 * haven't been fetched yet simply don't contribute; `count` says how many did.
 */
export function aggregateScoreHistory(
  history: ScoreHistory, dates: string[], maxStaleDays = 10,
): { score: number | null; count: number }[] {
  const metrics = Object.values(history.metrics ?? {}).filter((m) => m.side === "both");
  const cursors = metrics.map(() => 0);
  return dates.map((d) => {
    let sum = 0, n = 0;
    const t = Date.parse(`${d}T00:00:00Z`);
    metrics.forEach((m, k) => {
      const h = m.history;
      while (cursors[k] + 1 < h.length && h[cursors[k] + 1][0] <= d) cursors[k]++;
      const [hd, hs] = h[cursors[k]] ?? [];
      if (hd === undefined || hd > d) return;
      if ((t - Date.parse(`${hd}T00:00:00Z`)) / 86_400_000 > maxStaleDays) return;
      sum += hs; n++;
    });
    return { score: n ? Math.round(sum / n) : null, count: n };
  });
}
