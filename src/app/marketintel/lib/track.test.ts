import { describe, expect, it } from "vitest";
import { CALL, HOUR, horizonStats, type PulseSample } from "./track";

const t0 = Date.UTC(2026, 0, 1);
// 40 days hourly: price rises 1%/day for 20 days, then falls 1%/day.
const N = 40 * 24;
const px = (i: number) => 100 * Math.exp((0.01 * (i < 480 ? i : 960 - i)) / 24);

function series(score: (i: number) => { intraday: number | null; swing: number | null; macro: number | null }, skip: number[] = []) {
  const out: PulseSample[] = [];
  for (let i = 0; i < N; i++) {
    if (skip.includes(i)) continue;
    // Captured somewhere inside the hour, like the real recorder.
    out.push({ t: t0 + i * HOUR, at: t0 + i * HOUR + ((i * 7) % 50) * 60_000, px: px(i), model: 2, h: score(i), n: { intraday: 8, swing: 12, macro: 5 }, r: {} });
  }
  return out;
}

describe("horizonStats", () => {
  it("grades a perfect-foresight intraday call near 100%, across logging gaps", () => {
    const s = series((i) => ({ intraday: i + 24 < N && px(i + 24) > px(i) ? 50 : -50, swing: null, macro: null }), [100, 101]);
    const st = horizonStats(s, "intraday");
    expect(st.hitRate!).toBeGreaterThan(0.97);
    expect(st.bullAvg!).toBeGreaterThan(0);
    expect(st.bearAvg!).toBeLessThan(0);
    expect(st.windows).toBe(40);
  });

  it("scores an always-bullish swing call about half right when price rises then falls", () => {
    const st = horizonStats(series(() => ({ intraday: null, swing: 30, macro: null })), "swing");
    expect(st.hitRate!).toBeGreaterThan(0.3);
    expect(st.hitRate!).toBeLessThan(0.7);
    expect(st.bearAvg).toBeNull();
    expect(st.bullAvg).toBeCloseTo(st.baseAvg!, 10); // every graded hour was a bull call
    expect(st.hitRate).toBeCloseTo(st.baseUp!, 10); // always-long hits exactly the up-window rate
  });

  it("counts scores inside ±CALL as graded but not as calls", () => {
    const st = horizonStats(series(() => ({ intraday: null, swing: null, macro: CALL - 1 })), "macro");
    expect(st.graded).toBeGreaterThan(0);
    expect(st.calls).toBe(0);
    expect(st.hitRate).toBeNull();
    expect(st.windows).toBe(1);
  });

  it("grades nothing until a forward window has closed", () => {
    const short = series(() => ({ intraday: 50, swing: 50, macro: 50 })).slice(0, 20);
    expect(horizonStats(short, "intraday").graded).toBe(0);
    expect(horizonStats([], "swing")).toMatchObject({ graded: 0, calls: 0, hitRate: null, windows: 0 });
  });

  it("skips hours where the horizon had no score", () => {
    const st = horizonStats(series(() => ({ intraday: null, swing: null, macro: null })), "intraday");
    expect(st.graded).toBe(0);
  });
});
