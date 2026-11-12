import { afterEach, describe, expect, it, vi } from "vitest";
import { bybitKlines, bybitLongShare, bybitOiHistory, bybitSpot } from "./bybit";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockFetch(handler: (url: URL) => Response) {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url);
    return handler(url);
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("bybitKlines", () => {
  it("returns candles oldest first and drops malformed rows", async () => {
    const calls = mockFetch(() =>
      json({ result: { list: [["3", "1", "2", "0.5", "1.5", "10"], ["2", "x", "2", "1", "1", "1"], ["1", "1", "1", "1", "1", "1"]] } }),
    );
    const bars = await bybitKlines("linear", "15", 3);
    expect(bars.map((b) => b.t)).toEqual([1, 3]);
    expect(bars[1]).toEqual({ t: 3, o: 1, h: 2, l: 0.5, c: 1.5, v: 10 });
    expect(calls[0].searchParams.get("category")).toBe("linear");
    expect(calls[0].searchParams.get("interval")).toBe("15");
  });
});

describe("bybitOiHistory", () => {
  it("follows the cursor past Bybit's 200-row page and returns oldest first", async () => {
    const page = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({ timestamp: String(from - i), openInterest: String(from - i) }));
    const calls = mockFetch((url) =>
      url.searchParams.get("cursor")
        ? json({ result: { list: page(300, 100), nextPageCursor: "" } })
        : json({ result: { list: page(500, 200), nextPageCursor: "next%3D1" } }),
    );
    const pts = await bybitOiHistory("15min", 300);
    expect(pts).toHaveLength(300);
    expect(pts[0].t).toBeLessThan(pts.at(-1)!.t);
    expect(calls).toHaveLength(2);
    expect(calls[0].searchParams.get("limit")).toBe("200");
    expect(calls[1].searchParams.get("limit")).toBe("100");
    expect(calls[1].searchParams.get("cursor")).toBe("next=1");
  });

  it("gives up after enough pages when rows are unparseable but a cursor keeps coming", async () => {
    const calls = mockFetch(() => json({ result: { list: [{ timestamp: "x", openInterest: "y" }], nextPageCursor: "again" } }));
    expect(await bybitOiHistory("15min", 500)).toEqual([]);
    expect(calls).toHaveLength(3); // ceil(500 / 200)
  });

  it("stops when a page comes back empty, even with a cursor", async () => {
    const calls = mockFetch(() => json({ result: { list: [], nextPageCursor: "more" } }));
    expect(await bybitOiHistory("1h", 500)).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe("bybitLongShare", () => {
  it("reads buyRatio as the long share, oldest first", async () => {
    mockFetch(() => json({ result: { list: [{ buyRatio: "0.7", timestamp: "2" }, { buyRatio: "0.6", timestamp: "1" }] } }));
    expect(await bybitLongShare("15min", 2)).toEqual([{ t: 1, v: 0.6 }, { t: 2, v: 0.7 }]);
  });
});

describe("bybitSpot", () => {
  it("returns the last price", async () => {
    mockFetch(() => json({ result: { list: [{ lastPrice: "73433.1" }] } }));
    expect(await bybitSpot()).toBe(73433.1);
  });

  it("throws on an empty list so a fallback chain moves on", async () => {
    mockFetch(() => json({ result: { list: [] } }));
    await expect(bybitSpot()).rejects.toThrow("no price");
  });

  it("throws on an HTTP error (Bybit's 403 to some Cloudflare IPs)", async () => {
    mockFetch(() => json({}, 403));
    await expect(bybitSpot()).rejects.toThrow("HTTP 403");
  });
});
