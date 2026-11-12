import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { edgeCached } from "./edge-cache";

// Stand-in for the Workers Cache API (caches.default).
function fakeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    async match(key: string) {
      return store.get(key)?.clone();
    },
    async put(key: string, res: Response) {
      store.set(key, res.clone());
    },
  };
}

const route = (failed: number, sMaxAge = 60) => () =>
  Promise.resolve(
    Response.json(
      { failed, sources: Array.from({ length: 3 }, (_, i) => ({ source: `s${i}`, ok: i >= failed })) },
      { headers: { "cache-control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}` } },
    ),
  );

const failedIn = async (res: Response) => ((await res.json()) as { failed: number }).failed;

describe("edgeCached", () => {
  let cache: ReturnType<typeof fakeCache>;
  beforeEach(() => {
    cache = fakeCache();
    vi.stubGlobal("caches", { default: cache });
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("runs the route every time where there is no Cache API", async () => {
    vi.stubGlobal("caches", undefined);
    const load = vi.fn(route(0));
    const get = edgeCached("t", load);
    await get();
    await get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves a copy younger than s-maxage without running the route, with the route's own cache header", async () => {
    const load = vi.fn(route(0, 60));
    const get = edgeCached("t", load);
    await get();
    vi.setSystemTime(59_000);
    const res = await get();
    expect(load).toHaveBeenCalledTimes(1);
    expect(res.headers.get("x-mi-cache")).toBe("hit");
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=60, stale-while-revalidate=240");
    expect(res.headers.get("x-mi-stored-at")).toBeNull();
  });

  it("keeps the healthier copy when a refresh comes back with more failed sources", async () => {
    await edgeCached("t", route(0))();
    vi.setSystemTime(120_000);
    const res = await edgeCached("t", route(2))();
    expect(res.headers.get("x-mi-cache")).toBe("healthier");
    expect(await failedIn(res)).toBe(0);
  });

  it("takes a refresh that is as healthy or better, and caches it", async () => {
    await edgeCached("t", route(1))();
    vi.setSystemTime(120_000);
    expect(await failedIn(await edgeCached("t", route(1))())).toBe(1);
    vi.setSystemTime(240_000);
    expect(await failedIn(await edgeCached("t", route(0))())).toBe(0);
    vi.setSystemTime(250_000);
    const res = await edgeCached("t", route(3))();
    expect(res.headers.get("x-mi-cache")).toBe("hit");
    expect(await failedIn(res)).toBe(0);
  });

  it("serves the cached copy when the route itself errors, and doesn't cache the error", async () => {
    await edgeCached("t", route(1))();
    vi.setSystemTime(120_000);
    const res = await edgeCached("t", () => Promise.resolve(new Response("boom", { status: 500 })))();
    expect(res.headers.get("x-mi-cache")).toBe("healthier");
    expect(await failedIn(res)).toBe(1);
    vi.setSystemTime(1_800_000 + 130_000);
    const late = await edgeCached("t", () => Promise.resolve(new Response("boom", { status: 500 })))();
    expect(late.status).toBe(500);
  });

  it("stops preferring an old copy after 30 minutes", async () => {
    await edgeCached("t", route(0))();
    vi.setSystemTime(1_800_001);
    const res = await edgeCached("t", route(2))();
    expect(res.headers.get("x-mi-cache")).toBeNull();
    expect(await failedIn(res)).toBe(2);
  });
});
