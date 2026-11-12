import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiquidationData } from "@/app/marketintel/lib/types";
import { GET } from "../liquidations/route";

/**
 * The liquidation map runs on Binance when it can, on Bybit when Binance
 * refuses (always, from Cloudflare), and reports both failures when neither
 * answers. Upstreams are faked by URL; anything unlisted answers 403.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const T0 = 1_794_000_000_000;
const STEP = 15 * 60_000;
const PX = 100_000;
const times = Array.from({ length: 12 }, (_, i) => T0 + i * STEP);

const binance = {
  klines: times.map((t) => [t, String(PX), String(PX), String(PX), String(PX)]),
  oi: times.map((t, i) => ({ timestamp: t, sumOpenInterest: String(1000 + i * 10) })),
  top: times.map((t) => ({ timestamp: t, longAccount: "0.6" })),
};
// Bybit lists newest first.
const bybit = {
  klines: [...times].reverse().map((t) => [String(t), String(PX), String(PX), String(PX), String(PX), "1"]),
  oi: [...times].reverse().map((t, i) => ({ timestamp: String(t), openInterest: String(2000 - i * 10) })),
  ratio: [...times].reverse().map((t) => ({ timestamp: String(t), buyRatio: "0.55" })),
};

function upstreams({ binanceUp, bybitUp }: { binanceUp: boolean; bybitUp: boolean }) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const u = String(input);
    if (u.includes("binance.com")) {
      if (!binanceUp) return json({ msg: "restricted location" }, 451);
      if (u.includes("/fapi/v1/klines")) return json(binance.klines);
      if (u.includes("openInterestHist")) return json(binance.oi);
      if (u.includes("topLongShortPositionRatio")) return json(binance.top);
      if (u.includes("/fapi/v1/openInterest")) return json({ openInterest: "10000" }); // × mark = $1bn
      if (u.includes("/fapi/v1/premiumIndex")) return json({ markPrice: String(PX), lastFundingRate: "0.0001" });
    }
    if (u.includes("api.bybit.com") && bybitUp) {
      if (u.includes("/v5/market/kline")) return json({ result: { list: bybit.klines } });
      if (u.includes("/v5/market/open-interest")) return json({ result: { list: bybit.oi, nextPageCursor: "" } });
      if (u.includes("/v5/market/account-ratio")) return json({ result: { list: bybit.ratio } });
      if (u.includes("category=linear"))
        return json({ result: { list: [{ openInterest: "1", openInterestValue: "1000000000", fundingRate: "0.0001", markPrice: String(PX) }] } });
      if (u.includes("category=inverse"))
        return json({ result: { list: [{ openInterest: "500000000", openInterestValue: "0", fundingRate: "0.0001", markPrice: String(PX) }] } });
    }
    return json({}, 403);
  }));
}

const run = async () => (await (await GET()).json()) as LiquidationData;
const populated = (l: LiquidationData) => l.bins.filter((b) => b.longUsd > 0 || b.shortUsd > 0).length;

afterEach(() => vi.unstubAllGlobals());

describe("liquidations route", () => {
  it("runs on Binance when Binance answers", async () => {
    upstreams({ binanceUp: true, bybitUp: true });
    const l = await run();
    expect(l.venue).toBe("Binance");
    expect(l.price).toBe(PX);
    expect(populated(l)).toBeGreaterThan(0);
    // Binance BTCUSDT $1bn of $2.5bn total (Binance USDT + Bybit linear + inverse).
    expect(l.scale).toBeCloseTo(2.5);
    expect(l.sources.map((s) => s.source)).toEqual(["binance-klines-15m", "binance-oi-15m", "binance-top-15m"]);
  });

  it("falls back to Bybit when Binance refuses, without flagging Binance as unavailable", async () => {
    upstreams({ binanceUp: false, bybitUp: true });
    const l = await run();
    expect(l.venue).toBe("Bybit");
    expect(l.price).toBe(PX);
    expect(populated(l)).toBeGreaterThan(0);
    expect(l.scale).toBeCloseTo(1.5); // Bybit linear $1bn of $1.5bn
    expect(l.sources.every((s) => s.ok)).toBe(true);
    expect(l.sources.map((s) => s.source)).toEqual(["bybit-klines-15m", "bybit-oi-15m", "bybit-ls-15m"]);
  });

  it("returns an empty map and every failure when neither venue answers", async () => {
    upstreams({ binanceUp: false, bybitUp: false });
    const l = await run();
    expect(l.venue).toBeNull();
    expect(l.price).toBeNull();
    expect(l.bins).toEqual([]);
    expect(l.sources.filter((s) => !s.ok)).toHaveLength(6);
  });
});
