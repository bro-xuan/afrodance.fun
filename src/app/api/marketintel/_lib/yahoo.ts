import { getJSON } from "./http";

/** Yahoo Finance chart API (keyless), trying both hosts. Timestamps in ms. */

type Chart = {
  chart: {
    result: {
      meta: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators: { quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[] }[] };
    }[];
  };
};

export type YBar = { t: number; o: number; h: number; l: number; c: number };

export async function yahooChart(symbol: string, range: string, interval: string) {
  let err: unknown;
  for (const host of ["query1", "query2"]) {
    try {
      const r = await getJSON<Chart>(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
      const res = r.chart.result[0];
      const q = res.indicators.quote[0];
      const bars: YBar[] = (res.timestamp ?? []).flatMap((t, i) => {
        const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]];
        return o != null && h != null && l != null && c != null ? [{ t: t * 1000, o, h, l, c }] : [];
      });
      return { meta: res.meta, bars };
    } catch (e) {
      err = e;
    }
  }
  throw err instanceof Error ? err : new Error("Yahoo unreachable");
}
