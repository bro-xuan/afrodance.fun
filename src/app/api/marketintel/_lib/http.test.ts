import { describe, expect, it } from "vitest";
import { firstOk } from "./http";

const fail = (msg: string) => () => Promise.reject(new Error(msg));

describe("firstOk", () => {
  it("returns the primary when it works, and doesn't run the fallback", async () => {
    let fallbackRan = false;
    const r = await firstOk([
      ["binance", () => Promise.resolve(1)],
      ["bybit", () => ((fallbackRan = true), Promise.resolve(2))],
    ]);
    expect(r).toEqual({ value: 1, sources: [{ source: "binance", ok: true }] });
    expect(fallbackRan).toBe(false);
  });

  it("falls back, and doesn't report the failed primary as unavailable", async () => {
    const r = await firstOk([
      ["binance", fail("HTTP 451")],
      ["bybit", () => Promise.resolve(2)],
    ]);
    expect(r).toEqual({ value: 2, sources: [{ source: "bybit", ok: true }] });
  });

  it("reports every attempt when all fail", async () => {
    const r = await firstOk([
      ["binance", fail("HTTP 451")],
      ["bybit", fail("HTTP 403")],
    ]);
    expect(r.value).toBeNull();
    expect(r.sources).toEqual([
      { source: "binance", ok: false, error: "HTTP 451" },
      { source: "bybit", ok: false, error: "HTTP 403" },
    ]);
  });
});
