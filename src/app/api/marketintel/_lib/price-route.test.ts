import { afterEach, describe, expect, it, vi } from "vitest";
import type { PriceData } from "@/app/marketintel/lib/types";
import { GET } from "../price/route";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("price route", () => {
  it("serves Bybit candles when Binance refuses, and only flags what Bybit couldn't fill", async () => {
    const t0 = 1_794_000_000_000;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const u = String(input);
      if (u.includes("binance.com")) return json({ msg: "restricted location" }, 451);
      if (u.includes("api.bybit.com/v5/market/kline")) {
        const list = Array.from({ length: 5 }, (_, i) => [String(t0 - i * 3_600_000), "1", "2", "0.5", "1.5", "10"]);
        return json({ result: { list } });
      }
      return json({}, 403); // Yahoo (CME) down too
    }));

    const p = (await (await GET()).json()) as PriceData;
    expect(p.hourly).toHaveLength(5);
    expect(p.daily).toHaveLength(5);
    expect(p.perpHourly).toEqual([]);

    const failed = p.sources.filter((s) => !s.ok).map((s) => s.source);
    expect(failed).not.toContain("binance-1h");
    expect(failed).not.toContain("binance-1d");
    expect(failed).toContain("binance-perp-1h"); // no Bybit stand-in: perp CVD really is missing
    expect(failed).toContain("yahoo-cme");
    expect(p.sources.filter((s) => s.ok).map((s) => s.source)).toEqual(["bybit-1h", "bybit-1d"]);
  });
});
