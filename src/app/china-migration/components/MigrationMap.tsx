"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Direction, MigrationData, Particle } from "../types";
import { CHINA_LAT, CHINA_LNG } from "../types";
import {
  buildCountryGeoms,
  buildProjection,
  drawBaseMap,
  loadCountriesTopo,
  projectLngLat,
} from "../lib/projection";
import type { CountryGeom } from "../lib/projection";
import { buildDotPool } from "../lib/dots";
import { createParticle, drawParticles, stepParticles } from "../lib/particles";

const CHINA_CODE = 156;
const PEOPLE_PER_PARTICLE = 25_000; // 1 particle ≈ this many people moving in a year
const PARTICLE_TRAVEL_TIME = 2.4;   // seconds per arc — slower = visible streaks
const PLAYBACK_DURATION = 30;       // seconds for full 1990 → 2024
const COLOR_OUTBOUND = "#f59e6b";
const COLOR_INBOUND = "#5fb3c4";

// Density dots: each dot represents a fixed slice of population, so visual
// dot count per country == stock / POP_PER_DOT. Inbound stocks run ~10× smaller
// than outbound, so inbound uses a finer slice to keep both directions legible.
const POP_PER_DOT_OUT = 14_000;
const POP_PER_DOT_IN = 4_000;
// Per-country dot cap; stops the pool rejection-sampler from running away
// and keeps USA / HK / Japan clusters from becoming solid blobs. 280 covers
// the biggest clusters (USA 2.5M, HK 2.5M) with a little headroom for growth.
const MAX_DOTS_PER_COUNTRY = 280;
const DOT_RADIUS = 1.7;
// Single visibility gate per direction: a cluster only renders (BOTH dots and
// label) when growth-since-1990 exceeds this. Below it, the country is
// invisible. This guarantees every dotted country has a name attached.
const MIN_GROWTH_OUT = 80_000;
const MIN_GROWTH_IN = 25_000;

interface Props {
  data: MigrationData;
}

export function MigrationMap({ data }: Props) {
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const particleRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [topo, setTopo] = useState<unknown>(null);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const [direction, setDirection] = useState<Direction>("both");
  const [playing, setPlaying] = useState(false);
  const [animYear, setAnimYear] = useState(data.years[0]);
  // Tracks whether the user has touched the player at all. While false, the
  // Play button gets a pulsing halo that draws the eye to the primary CTA.
  const [hasInteracted, setHasInteracted] = useState(false);

  // Load TopoJSON once.
  useEffect(() => {
    fetch("/china-migration/countries-110m.json")
      .then((r) => r.json())
      .then(setTopo)
      .catch((e) => console.error("topojson load failed", e));
  }, []);

  // Track container size + DPR for HiDPI canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setSize({ w: Math.round(r.width), h: Math.round(r.height), dpr });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 1990 baseline stock tables. Dot counts on the map are derived as
  // (currentStock − baseline) so the map starts visually empty in 1990 and
  // fills with the accumulated migration SINCE 1990 — matching the
  // narrative "no migration has happened yet; watch it pile up".
  const baselines = useMemo(() => {
    const y0 = String(data.years[0]);
    return {
      outbound: (data.emigration[y0] ?? {}) as Record<string, number>,
      inbound: (data.immigration[y0] ?? {}) as Record<string, number>,
    };
  }, [data]);

  // Project country centroids → screen pixels (re-runs on resize).
  const projection = useMemo(() => {
    if (!size.w || !size.h) return null;
    return buildProjection(size.w, size.h);
  }, [size.w, size.h]);

  const projectedCentroids = useMemo(() => {
    if (!projection) return null;
    const map = new Map<number, [number, number]>();
    for (const c of Object.values(data.countries)) {
      const p = projectLngLat(projection, c.lng, c.lat);
      if (p) map.set(c.code, p);
    }
    const cn = projectLngLat(projection, CHINA_LNG, CHINA_LAT);
    return { partners: map, china: cn };
  }, [projection, data.countries]);

  // Draw the base map whenever size, projection, or topo changes.
  useEffect(() => {
    if (!topo || !projection || !baseRef.current || !size.w) return;
    const cv = baseRef.current;
    cv.width = size.w * size.dpr;
    cv.height = size.h * size.dpr;
    cv.style.width = `${size.w}px`;
    cv.style.height = `${size.h}px`;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    const fc = loadCountriesTopo(topo as never);
    drawBaseMap(ctx, size.w, size.h, projection, fc, CHINA_CODE);
  }, [topo, projection, size.w, size.h, size.dpr]);

  // Animation state kept in refs so the rAF loop survives React state updates.
  const particlesRef = useRef<Particle[]>([]);
  const emissionDebtRef = useRef<Map<string, number>>(new Map());
  const dataYearRef = useRef<number>(data.years[0]);
  const directionRef = useRef<Direction>(direction);
  const playingRef = useRef<boolean>(playing);
  // Country polygon geometry in pixel space, keyed by ISO-numeric / M.49 code.
  const countryGeomsRef = useRef<Map<number, CountryGeom>>(new Map());
  // Union list of every country's Path2D, used by the dot sampler to snap
  // off-topo territories (HK, Macao, Singapore) onto the nearest coastline.
  const allPathsRef = useRef<Path2D[]>([]);
  // Per-country dot pool (first N points of this array are drawn each frame,
  // where N scales with the country's current interpolated migrant stock).
  const dotPoolsRef = useRef<Map<string, Array<[number, number]>>>(new Map());
  // Persistent placed-label rectangles keyed by country code. Labels, once
  // placed, stay put across frames to stop the stack from reshuffling as
  // cluster magnitudes change during animation. The map is pruned when a
  // cluster drops below the visibility threshold.
  type StoredLabel = {
    rect: { x: number; y: number; w: number; h: number };
    cx: number;   // cluster centroid at time of placement
    cy: number;
    tw: number;   // last-measured text width so we can detect overflow
  };
  const labelRectsRef = useRef<Map<number, StoredLabel>>(new Map());
  // Landing flashes: brief bright pulses at the end of each arriving particle,
  // fading over ~450ms to reinforce "a packet of people just landed here".
  type Flash = { x: number; y: number; color: string; t: number };
  const flashesRef = useRef<Flash[]>([]);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // Spacebar toggles play/pause from anywhere on the page, the way every
  // media player on the web behaves. Skipped when the user is focused in a
  // form control (range slider, button) so we don't double-fire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      setHasInteracted(true);
      if (dataYearRef.current >= data.years[data.years.length - 1]) {
        dataYearRef.current = data.years[0];
        setAnimYear(data.years[0]);
      }
      setPlaying((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.years]);

  // Build pixel-space polygon geometry for every country once topo +
  // projection are ready. Dot pools are derived from these polygons and
  // cached per-country; both caches invalidate together on resize.
  useEffect(() => {
    if (!topo || !projection) return;
    const geoms = buildCountryGeoms(topo as never, projection);
    countryGeomsRef.current = geoms;
    allPathsRef.current = Array.from(geoms.values()).map((g) => g.path);
    dotPoolsRef.current = new Map();
    // Pool positions are projection-dependent, so resize invalidates label
    // placements too (centroids move in pixel space).
    labelRectsRef.current = new Map();
  }, [topo, projection]);
  // When the user scrubs the slider while paused, sync the internal year ref.
  useEffect(() => {
    if (!playingRef.current) dataYearRef.current = animYear;
  }, [animYear]);

  // Particle animation loop. Re-runs only when geometry, projection, or data changes.
  useEffect(() => {
    if (!projectedCentroids || !particleRef.current || !size.w) return;
    const cv = particleRef.current;
    cv.width = size.w * size.dpr;
    cv.height = size.h * size.dpr;
    cv.style.width = `${size.w}px`;
    cv.style.height = `${size.h}px`;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    particlesRef.current = [];
    emissionDebtRef.current = new Map();

    let lastTs = performance.now();
    let rafId = 0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (playingRef.current) {
        const span = data.years[data.years.length - 1] - data.years[0];
        const yearsPerSec = span / PLAYBACK_DURATION;
        dataYearRef.current += yearsPerSec * dt;
        if (dataYearRef.current >= data.years[data.years.length - 1]) {
          dataYearRef.current = data.years[data.years.length - 1];
          playingRef.current = false;
          setPlaying(false);
        }
        setAnimYear(Math.round(dataYearRef.current * 10) / 10);
      }

      const currentYear = dataYearRef.current;
      const { prev, next } = bracket(data.years, currentYear);
      const dir = directionRef.current;
      const flowSets: Array<{ table?: Record<string, number>; prevTable?: Record<string, number>; dir: "outbound" | "inbound" }> = [];
      if (dir === "outbound" || dir === "both") {
        flowSets.push({ table: data.emigration[String(next)], prevTable: data.emigration[String(prev)], dir: "outbound" });
      }
      if (dir === "inbound" || dir === "both") {
        flowSets.push({ table: data.immigration[String(next)], prevTable: data.immigration[String(prev)], dir: "inbound" });
      }

      const period = next - prev || 5;
      const frac = period > 0 ? (currentYear - prev) / period : 0;
      const chinaPx = projectedCentroids.china;

      // Gather per-country "cluster" info for this frame: one entry per
      // partner with stock > 0 in the active direction. Outbound clusters
      // sit in the destination country (where Chinese-born actually live);
      // inbound clusters sit in the origin country (reading as "X's people
      // now in China") so the per-country story stays legible.
      type Cluster = {
        code: number;
        cx: number;
        cy: number;
        color: string;
        dir: "outbound" | "inbound";
        stock: number;
        targetN: number; // target dot count for this frame
      };
      const clusters: Cluster[] = [];

      if (chinaPx) {
        for (const { table, prevTable, dir: d } of flowSets) {
          if (!table) continue;
          const popPerDot = d === "outbound" ? POP_PER_DOT_OUT : POP_PER_DOT_IN;
          const baseTable = d === "outbound" ? baselines.outbound : baselines.inbound;
          const minGrowth = d === "outbound" ? MIN_GROWTH_OUT : MIN_GROWTH_IN;
          for (const code in table) {
            const partnerNum = Number(code);
            const partnerPx = projectedCentroids.partners.get(partnerNum);
            if (!partnerPx) continue;
            const stockNext = table[code] ?? 0;
            const stockPrev = prevTable?.[code] ?? stockNext;
            const stockNow = stockPrev + (stockNext - stockPrev) * frac;
            // Growth since 1990 is what we actually visualize. Negative growth
            // (populations that shrank due to deaths or naturalizations) is
            // clamped to zero — we can't show "negative migration" as dots.
            const base = baseTable[code] ?? 0;
            const growth = Math.max(0, stockNow - base);
            // Single visibility gate: countries below the threshold get
            // neither dots nor a label, so the map never has anonymous dots.
            if (growth < minGrowth) continue;

            clusters.push({
              code: partnerNum,
              cx: partnerPx[0],
              cy: partnerPx[1],
              color: d === "outbound" ? COLOR_OUTBOUND : COLOR_INBOUND,
              dir: d,
              stock: growth,
              targetN: Math.min(
                MAX_DOTS_PER_COUNTRY,
                Math.max(0, Math.round(growth / popPerDot))
              ),
            });

            // Particle emission only while actively playing. When paused or
            // finished, the accumulated dot field stays visible but the air
            // traffic stops — the scene settles instead of buzzing forever.
            if (!playingRef.current) continue;

            const annualFlow = Math.abs(stockNext - stockPrev) / period;
            const baseline = Math.max(stockNext, stockPrev) * 0.015;
            const peoplePerParticle =
              d === "outbound" ? PEOPLE_PER_PARTICLE : PEOPLE_PER_PARTICLE / 6;
            const totalRate = annualFlow + baseline;
            if (totalRate <= 0) continue;
            const pairKey = `${d}-${code}`;
            const debt = (emissionDebtRef.current.get(pairKey) ?? 0) + totalRate * dt;
            const toEmit = Math.floor(debt / peoplePerParticle);
            emissionDebtRef.current.set(pairKey, debt - toEmit * peoplePerParticle);
            for (let i = 0; i < toEmit && particlesRef.current.length < 1200; i++) {
              const start = d === "outbound" ? chinaPx : partnerPx;
              const end = d === "outbound" ? partnerPx : chinaPx;
              particlesRef.current.push(
                createParticle(pairKey, partnerNum, d, start, end, 1 / PARTICLE_TRAVEL_TIME)
              );
            }
          }
        }
      }

      // Detect arrivals before stepping: particles whose t will cross 1.0
      // this frame are "landing" — drop a flash at their destination so the
      // eye sees a pulse where a packet of people just accumulated.
      for (const p of particlesRef.current) {
        if (p.t + p.speed * dt >= 1) {
          flashesRef.current.push({
            x: p.endX,
            y: p.endY,
            color: p.direction === "outbound" ? COLOR_OUTBOUND : COLOR_INBOUND,
            t: 0,
          });
        }
      }
      particlesRef.current = stepParticles(particlesRef.current, dt);
      // Age flashes; drop once fully faded. 0.45s lifespan matches a slow blink.
      const flashLife = 0.45;
      flashesRef.current = flashesRef.current
        .map((f) => ({ ...f, t: f.t + dt }))
        .filter((f) => f.t < flashLife);

      // ─── RENDER ────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, size.w, size.h);

      // Consolidate per-direction clusters into one entry per country so the
      // map shows a single label per country (not stacked "Hong Kong +831k"
      // / "Hong Kong +311k"). The entry carries both numbers when both
      // directions are above threshold.
      type CountryEntry = {
        code: number;
        cx: number;
        cy: number;
        name: string;
        out?: Cluster;
        in?: Cluster;
        biggest: number; // for sort priority
      };
      const byCountry = new Map<number, CountryEntry>();
      for (const c of clusters) {
        let entry = byCountry.get(c.code);
        if (!entry) {
          const rawName = data.countries[String(c.code)]?.name ?? String(c.code);
          const name = rawName
            .replace(/\*$/, "")
            .replace(/^China, /, "")
            .replace(/ Province of China$/, "")
            .replace(/ SAR$/, "")
            .replace(/^United States of America$/, "United States")
            .replace(/^Republic of Korea$/, "South Korea")
            .replace(/^Russian Federation$/, "Russia")
            .replace(/^Viet Nam$/, "Vietnam");
          entry = { code: c.code, cx: c.cx, cy: c.cy, name, biggest: 0 };
          byCountry.set(c.code, entry);
        }
        if (c.dir === "outbound") entry.out = c;
        else entry.in = c;
        entry.biggest = Math.max(entry.biggest, c.stock);
      }

      // PASS 1 — Place labels. Persistent placement: a label, once placed,
      // stays in its rect across frames to stop the stack from reshuffling
      // as cluster magnitudes change. New entries compete for space with
      // the already-placed set treated as occupied.
      ctx.save();
      ctx.font = '600 11px -apple-system, "Segoe UI", system-ui, Roboto, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      type PlacedLabel = {
        entry: CountryEntry;
        rect: { x: number; y: number; w: number; h: number };
      };
      const placedLabels: PlacedLabel[] = [];
      const placedRects: Array<{ x: number; y: number; w: number; h: number }> = [];
      const overlap = (a: { x: number; y: number; w: number; h: number }) =>
        placedRects.some(
          (b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        );

      // Build the display text for one entry. Numbers are colored at render
      // time; we only need the full string here to measure total width.
      const textFor = (e: CountryEntry) => {
        const parts = [e.name];
        if (e.out) parts.push(`+${formatStockShort(e.out.stock)}`);
        if (e.in) parts.push(`+${formatStockShort(e.in.stock)}`);
        return parts.join("  ");
      };

      // Prune stored rects for countries that no longer have a visible cluster.
      for (const code of Array.from(labelRectsRef.current.keys())) {
        if (!byCountry.has(code)) labelRectsRef.current.delete(code);
      }

      const entries = Array.from(byCountry.values()).sort(
        (a, b) => b.biggest - a.biggest
      );

      // First loop — reuse previously-placed rects for entries whose stored
      // rect still fits the current (possibly wider) text. These are locked
      // in before anyone else competes for space, which is what stops the
      // jumping.
      const pending: CountryEntry[] = [];
      for (const e of entries) {
        const stored = labelRectsRef.current.get(e.code);
        const text = textFor(e);
        const tw = ctx.measureText(text).width;
        const th = 15;
        const pad = 4;
        const needW = tw + pad * 2;
        if (stored && Math.abs(stored.cx - e.cx) < 0.5 && Math.abs(stored.cy - e.cy) < 0.5) {
          // Grow the stored rect to the right if text got wider; otherwise
          // reuse as-is. Width shrinkage is ignored to avoid tiny jumps.
          const reuseW = Math.max(stored.rect.w, needW);
          const reuseRect = { ...stored.rect, w: reuseW };
          if (!overlap(reuseRect) && reuseRect.x + reuseRect.w <= size.w - 2) {
            placedRects.push(reuseRect);
            placedLabels.push({ entry: e, rect: reuseRect });
            labelRectsRef.current.set(e.code, { rect: reuseRect, cx: e.cx, cy: e.cy, tw });
            continue;
          }
        }
        pending.push(e);
      }

      // Second loop — place entries that don't have a valid stored rect,
      // searching a ring of positions around the cluster centroid.
      for (const e of pending) {
        const text = textFor(e);
        const tw = ctx.measureText(text).width;
        const th = 15;
        const pad = 4;
        const targetN = Math.max(e.out?.targetN ?? 0, e.in?.targetN ?? 0);
        const r = Math.max(12, Math.min(32, 6 + Math.sqrt(targetN) * 2));
        const tries: Array<{ dx: number; dy: number }> = [];
        const distances = [r, r + 18, r + 40, r + 70, r + 110];
        const angles = 16;
        for (const dist of distances) {
          for (let a = 0; a < angles; a++) {
            const theta = (a / angles) * Math.PI * 2;
            const ax = Math.cos(theta);
            const ay = Math.sin(theta);
            const dx = ax > 0 ? ax * dist : ax * dist - tw - pad * 2;
            const dy = ay * dist - th / 2;
            tries.push({ dx, dy });
          }
        }
        let placedRect: { x: number; y: number; w: number; h: number } | null = null;
        for (const t of tries) {
          const rect = {
            x: Math.max(2, Math.min(size.w - 2 - (tw + pad * 2), e.cx + t.dx)),
            y: Math.max(2, Math.min(size.h - 2 - th, e.cy + t.dy)),
            w: tw + pad * 2,
            h: th,
          };
          if (!overlap(rect)) {
            placedRect = rect;
            break;
          }
        }
        if (!placedRect) continue;
        placedRects.push(placedRect);
        placedLabels.push({ entry: e, rect: placedRect });
        labelRectsRef.current.set(e.code, { rect: placedRect, cx: e.cx, cy: e.cy, tw });
      }
      ctx.restore();

      const placedCountryCodes = new Set(placedLabels.map((p) => p.entry.code));

      // PASS 2 — Density dots, but only for countries whose label was placed.
      // A country with no label gets no dots, so the map never has
      // anonymous accumulations.
      const geoms = countryGeomsRef.current;
      const pools = dotPoolsRef.current;
      const allPaths = allPathsRef.current;
      const visibleClusters = clusters
        .filter((c) => placedCountryCodes.has(c.code))
        .sort((a, b) => b.targetN - a.targetN);
      for (const c of visibleClusters) {
        const poolKey = `${c.dir}-${c.code}`;
        let pool = pools.get(poolKey);
        if (!pool) {
          // Direction-aware seed so outbound (warm) and inbound (cool) dots
          // for the same country land on different positions inside the
          // polygon — otherwise at places like Hong Kong where both flows
          // are large, cool dots sit exactly on top of warm ones and the
          // inbound story disappears.
          const seed =
            (c.code * 2654435761) ^ (c.dir === "outbound" ? 0x51c : 0x9a3);
          pool = buildDotPool(
            seed,
            geoms.get(c.code),
            [c.cx, c.cy],
            MAX_DOTS_PER_COUNTRY,
            ctx,
            allPaths
          );
          pools.set(poolKey, pool);
        }
        const n = Math.min(pool.length, c.targetN);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < n; i++) {
          const [px, py] = pool[i];
          ctx.beginPath();
          ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Landing flashes: bright pulse that fades out quickly.
      for (const f of flashesRef.current) {
        const k = 1 - f.t / flashLife;
        const r = 2 + (1 - k) * 10;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.35 * k;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.8, 0, Math.PI * 2);
        ctx.globalAlpha = 0.9 * k;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawParticles(ctx, particlesRef.current, COLOR_OUTBOUND, COLOR_INBOUND);

      // PASS 3 — Render the per-country labels we placed in pass 1. Each
      // label shows the country name in white, then the outbound number in
      // warm and/or inbound number in cool. A thin leader line runs back to
      // the cluster centroid when the label sits far enough away to need one.
      ctx.save();
      ctx.font = '600 11px -apple-system, "Segoe UI", system-ui, Roboto, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const { entry: e, rect: placedRect } of placedLabels) {
        const labelMidX = placedRect.x + placedRect.w / 2;
        const labelMidY = placedRect.y + placedRect.h / 2;
        const dxm = labelMidX - e.cx;
        const dym = labelMidY - e.cy;
        const dist = Math.hypot(dxm, dym);
        // Leader line colored by the bigger of the two flows.
        const leaderColor =
          (e.out?.stock ?? 0) >= (e.in?.stock ?? 0) ? COLOR_OUTBOUND : COLOR_INBOUND;
        const leaderTargetN = Math.max(e.out?.targetN ?? 0, e.in?.targetN ?? 0);
        if (dist > 18) {
          const nearX =
            e.cx + (dxm / dist) * Math.min(dist - 6, 8 + Math.sqrt(leaderTargetN));
          const nearY =
            e.cy + (dym / dist) * Math.min(dist - 6, 8 + Math.sqrt(leaderTargetN));
          const edgeX = dxm > 0 ? placedRect.x - 1 : placedRect.x + placedRect.w + 1;
          const edgeY = labelMidY;
          ctx.strokeStyle = leaderColor;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(nearX, nearY);
          ctx.lineTo(edgeX, edgeY);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "rgba(14,23,38,0.9)";
        ctx.fillRect(placedRect.x, placedRect.y, placedRect.w, placedRect.h);
        // Draw name (white), then each number in its direction's color.
        let x = placedRect.x + 4;
        const y = placedRect.y + placedRect.h / 2;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText(e.name, x, y);
        x += ctx.measureText(e.name).width + 6;
        if (e.out) {
          const t = `+${formatStockShort(e.out.stock)}`;
          ctx.fillStyle = COLOR_OUTBOUND;
          ctx.fillText(t, x, y);
          x += ctx.measureText(t).width + 6;
        }
        if (e.in) {
          const t = `+${formatStockShort(e.in.stock)}`;
          ctx.fillStyle = COLOR_INBOUND;
          ctx.fillText(t, x, y);
        }
      }
      ctx.restore();

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [projectedCentroids, size.w, size.h, size.dpr, data]);

  // Partner ranking panel. Ranks by GROWTH since 1990 (same metric the map
  // visualises) so the numbers on map and panel tell the same story. Every
  // country with a growth of at least PANEL_MIN_GROWTH is included and the
  // list is scrollable — the reader can see the full long tail, not just
  // the top 10. Per-country series and biggest-5-year-jump are computed
  // once here so the row component stays cheap.
  const PANEL_MIN_GROWTH = 1_000;
  const rankedPartners = useMemo(() => {
    const { prev } = bracket(data.years, animYear);
    const baseYear = String(data.years[0]);
    const buildList = (tables: Record<string, Record<string, number>>) => {
      const current = tables[String(prev)] ?? {};
      const base = tables[baseYear] ?? {};
      const codes = new Set([
        ...Object.keys(current),
        ...Object.keys(base),
      ]);
      return Array.from(codes)
        .map((code) => {
          const stockNow = current[code] ?? 0;
          const stockBase = base[code] ?? 0;
          const growth = Math.max(0, stockNow - stockBase);
          const series = data.years.map((y) => tables[String(y)]?.[code] ?? 0);
          // Find the biggest positive 5-year jump, if any. Gives each row
          // a "when did most of this happen" anchor, not just a lifetime total.
          let peakDelta = 0;
          let peakIdx = 0;
          for (let i = 1; i < series.length; i++) {
            const d = series[i] - series[i - 1];
            if (d > peakDelta) {
              peakDelta = d;
              peakIdx = i;
            }
          }
          return {
            code: Number(code),
            n: growth,
            total: stockNow,
            name: data.countries[code]?.name ?? code,
            series,
            peakDelta,
            peakPeriod:
              peakIdx > 0
                ? `${data.years[peakIdx - 1]}–${String(data.years[peakIdx]).slice(2)}`
                : null,
          };
        })
        .filter((r) => r.n >= PANEL_MIN_GROWTH)
        .sort((a, b) => b.n - a.n);
    };
    return {
      out: buildList(data.emigration),
      in: buildList(data.immigration),
    };
  }, [animYear, data]);

  const yearLabel = Math.round(animYear);
  const currentSnapshotIdx = data.years.indexOf(bracket(data.years, animYear).prev);

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={containerRef}
        className="relative w-full aspect-[2/1] min-h-[280px] overflow-hidden rounded-lg bg-[#0e1726] ring-1 ring-white/5"
      >
        <canvas ref={baseRef} className="absolute inset-0" />
        <canvas ref={particleRef} className="absolute inset-0" />
        {/* Year + subtitle sit in the empty South Pacific so they never
            cover a dot cluster (major clusters are in North America, Europe,
            East Asia, and Southeast Asia; the lower-left ocean is always
            empty). */}
        <div className="pointer-events-none absolute bottom-4 left-5 flex flex-col gap-1">
          <div
            className="text-5xl md:text-7xl tracking-tight text-white tabular-nums leading-none"
            style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 500 }}
          >
            {yearLabel}
          </div>
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/55">
            International migrants · stock at mid-year
          </div>
        </div>
        <div className="pointer-events-none absolute top-3 right-4 flex items-center gap-4 text-[10px] md:text-xs text-white/65">
          <LegendDot color={COLOR_OUTBOUND} label="Out of China" />
          <LegendDot color={COLOR_INBOUND} label="Into China" />
        </div>
      </div>

      <Controls
        years={data.years}
        animYear={animYear}
        playing={playing}
        direction={direction}
        hasInteracted={hasInteracted}
        onPlayPause={() => {
          setHasInteracted(true);
          if (animYear >= data.years[data.years.length - 1]) {
            setAnimYear(data.years[0]);
          }
          setPlaying((p) => !p);
        }}
        onRewind={() => {
          setHasInteracted(true);
          setPlaying(false);
          setAnimYear(data.years[0]);
        }}
        onYearChange={(y) => {
          setHasInteracted(true);
          setPlaying(false);
          setAnimYear(y);
        }}
        onDirection={(d) => {
          setHasInteracted(true);
          setDirection(d);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PartnersPanel
          title={`Biggest growth out of China · since ${data.years[0]}`}
          color={COLOR_OUTBOUND}
          rows={rankedPartners.out}
          years={data.years}
          currentIdx={currentSnapshotIdx}
        />
        <PartnersPanel
          title={`Biggest growth into China · since ${data.years[0]}`}
          color={COLOR_INBOUND}
          rows={rankedPartners.in}
          years={data.years}
          currentIdx={currentSnapshotIdx}
        />
      </div>
    </div>
  );
}

function bracket(years: number[], y: number): { prev: number; next: number; frac: number } {
  if (y <= years[0]) return { prev: years[0], next: years[0], frac: 0 };
  if (y >= years[years.length - 1]) {
    const last = years[years.length - 1];
    return { prev: last, next: last, frac: 0 };
  }
  for (let i = 0; i < years.length - 1; i++) {
    if (y >= years[i] && y < years[i + 1]) {
      return { prev: years[i], next: years[i + 1], frac: (y - years[i]) / (years[i + 1] - years[i]) };
    }
  }
  return { prev: years[0], next: years[0], frac: 0 };
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

interface ControlsProps {
  years: number[];
  animYear: number;
  playing: boolean;
  direction: Direction;
  hasInteracted: boolean;
  onPlayPause: () => void;
  onRewind: () => void;
  onYearChange: (y: number) => void;
  onDirection: (d: Direction) => void;
}

function Controls({
  years,
  animYear,
  playing,
  direction,
  hasInteracted,
  onPlayPause,
  onRewind,
  onYearChange,
  onDirection,
}: ControlsProps) {
  const min = years[0];
  const max = years[years.length - 1];
  const atEnd = !playing && animYear >= max;
  const progressPct = ((Math.min(Math.max(animYear, min), max) - min) / (max - min)) * 100;
  const showPulse = !hasInteracted && !playing;
  const playLabel = playing ? "Pause" : atEnd ? "Replay 1990 to 2024" : "Play 1990 to 2024";
  const PrimaryIcon = playing ? Pause : atEnd ? RotateCcw : Play;

  return (
    <div className="flex flex-col gap-4 text-white/85">
      {/* Primary row: big Play, scrubber, reset. */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onPlayPause}
          aria-label={playLabel}
          title={playLabel + " (space)"}
          className={`relative grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white text-[#0e1726] hover:bg-white/90 transition shrink-0 ${
            showPulse ? "cm-play-pulse" : ""
          }`}
        >
          <PrimaryIcon size={20} className={!playing && !atEnd ? "ml-0.5" : ""} />
        </button>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={Math.round(animYear)}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="cm-scrubber"
            style={{ ["--cm-progress" as string]: `${progressPct}%` }}
            aria-label="Year"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Math.round(animYear)}
          />
          <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums">
            <span>{min}</span>
            <span aria-hidden className="hidden sm:inline">
              {years.slice(1, -1).map((y) => y).join("  ·  ")}
            </span>
            <span>{max}</span>
          </div>
        </div>

        <button
          onClick={onRewind}
          aria-label="Reset to 1990"
          title="Reset to 1990"
          className="grid place-items-center w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 text-white/85 transition shrink-0"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Secondary row: direction toggle, color-keyed to the dots on the map. */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 hidden sm:inline">
          Show
        </span>
        <div className="inline-flex rounded-full bg-white/8 p-1">
          <DirectionPill
            label="Both"
            active={direction === "both"}
            onClick={() => onDirection("both")}
          />
          <DirectionPill
            label="Out of China"
            active={direction === "outbound"}
            color={COLOR_OUTBOUND}
            onClick={() => onDirection("outbound")}
          />
          <DirectionPill
            label="Into China"
            active={direction === "inbound"}
            color={COLOR_INBOUND}
            onClick={() => onDirection("inbound")}
          />
        </div>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-white/35 hidden md:inline">
          Tip: press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-[10px]">space</kbd> to play / pause
        </span>
      </div>
    </div>
  );
}

function DirectionPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
        active ? "bg-white text-[#0e1726]" : "text-white/70 hover:text-white"
      }`}
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

interface PartnerRow {
  code: number;
  n: number;           // growth since baseline
  total: number;       // absolute stock at current year
  name: string;
  series: number[];    // stock across all snapshot years
  peakDelta: number;   // biggest positive 5-year jump
  peakPeriod: string | null; // "2015–20" or null when flat
}

function PartnersPanel({
  title,
  color,
  rows,
  years,
  currentIdx,
}: {
  title: string;
  color: string;
  rows: PartnerRow[];
  years: number[];
  currentIdx: number;
}) {
  const peakAcrossPanel = Math.max(1, ...rows.flatMap((r) => r.series));
  const totalGrowth = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="rounded-md bg-white/[0.04] ring-1 ring-white/5 p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-xs uppercase tracking-[0.18em] text-white/60">{title}</h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
          {years[currentIdx]}
        </span>
      </div>
      <div className="text-[10px] text-white/40 mb-3 flex items-center gap-3">
        <span>
          <span className="tabular-nums text-white/70">{rows.length}</span> countries
        </span>
        <span className="text-white/20">·</span>
        <span>
          total growth{" "}
          <span className="tabular-nums text-white/70">+{formatExact(totalGrowth)}</span>
        </span>
      </div>
      {/* Scrollable list: full long tail visible, not just top 10. Custom
          overflow styling keeps it visually flush with the panel chrome. */}
      <ol
        className="flex flex-col gap-2 overflow-y-auto pr-1 -mr-1"
        style={{ maxHeight: 520 }}
      >
        {rows.map((r, idx) => (
          <li
            key={r.code}
            className="grid grid-cols-[22px_minmax(0,1fr)_130px_minmax(110px,auto)] items-start gap-2.5 text-sm"
          >
            <div className="text-right text-[11px] tabular-nums pt-0.5 text-white/35">
              {idx + 1}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="truncate text-white/90 leading-tight">
                {r.name.replace(/\*$/, "")}
              </div>
              {r.peakPeriod && r.peakDelta >= 5_000 && (
                <div className="text-[10px] text-white/35 truncate">
                  peak +{formatCompact(r.peakDelta)} in {r.peakPeriod}
                </div>
              )}
            </div>
            <Sparkline
              series={r.series}
              currentIdx={currentIdx}
              color={color}
              max={peakAcrossPanel}
              years={years}
            />
            <div className="text-right tabular-nums leading-tight pt-0.5">
              <div className="text-white/95 text-xs">+{formatExact(r.n)}</div>
              <div className="text-white/40 text-[10px]">
                of {formatExact(r.total)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Sparkline({
  series,
  currentIdx,
  color,
  max,
  years,
}: {
  series: number[];
  currentIdx: number;
  color: string;
  max: number;
  years: number[];
}) {
  const W = 130;
  const H = 38;
  const PAD_X = 3;
  const PAD_Y = 4;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xAt = (i: number) => PAD_X + (i / (series.length - 1)) * innerW;
  const yAt = (v: number) => PAD_Y + innerH - (v / max) * innerH;
  const linePath =
    series.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(series.length - 1).toFixed(1)},${(H - PAD_Y).toFixed(
    1,
  )} L${xAt(0).toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`;
  const cx = xAt(currentIdx);
  const cy = yAt(series[currentIdx] ?? 0);
  const currentValue = series[currentIdx] ?? 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Snapshot ticks: one per year sample, so each 5-year period reads as
          a visible span. Helps the reader see "big jump in 2005–2010" without
          having to squint at the curve. */}
      {series.map((_, i) => (
        <line
          key={i}
          x1={xAt(i)}
          x2={xAt(i)}
          y1={H - PAD_Y}
          y2={H - PAD_Y + 2}
          stroke="white"
          strokeOpacity={0.18}
          strokeWidth={0.6}
        />
      ))}
      <path d={areaPath} fill={color} fillOpacity={0.16} />
      <path d={linePath} fill="none" stroke={color} strokeOpacity={0.9} strokeWidth={1.2} />
      {/* Vertical guide + big dot at the current year. The value bubble
          floats just above the dot so the reader can read the stock without
          looking at the right-hand column. */}
      <line
        x1={cx}
        x2={cx}
        y1={PAD_Y}
        y2={H - PAD_Y}
        stroke="white"
        strokeOpacity={0.22}
        strokeWidth={0.7}
      />
      <circle cx={cx} cy={cy} r={2.6} fill={color} stroke="#0e1726" strokeWidth={1} />
      {currentValue > 0 && (
        <text
          x={cx}
          y={Math.max(cy - 5, 8)}
          fontSize={9}
          textAnchor={cx > W - 26 ? "end" : cx < 26 ? "start" : "middle"}
          fill="white"
          fillOpacity={0.75}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCompact(currentValue)}
        </text>
      )}
      <title>
        {years
          .map((y, i) => `${y}: ${formatExact(series[i] ?? 0)}`)
          .join("\n")}
      </title>
    </svg>
  );
}

// Exact integer with thousands separators — "1,234,567". Used in the growth
// and total columns so the reader can see the precise stock, not a rounded M/k.
function formatExact(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

// Compact form for the inline sparkline value bubble and the peak-period
// annotation. Keeps two decimals on millions so the reader can tell 1.23M
// apart from 1.45M without a click.
function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatStockShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}
