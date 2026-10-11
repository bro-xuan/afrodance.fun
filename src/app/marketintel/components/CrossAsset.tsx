"use client";

import { C, ago, price } from "../lib/format";
import type { CrossData, CrossQuote } from "../lib/types";
import { Panel, Skeleton } from "./ui";

const fmtLast = (q: CrossQuote) => (q.unit === "pct" ? `${q.last.toFixed(3)}%` : q.unit === "usd" ? price(q.last) : q.last.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const fmtChange = (q: CrossQuote) =>
  q.change === null ? "n/a" : q.unit === "pct" ? `${q.change >= 0 ? "+" : "−"}${Math.abs(q.change * 100).toFixed(1)}bp` : `${q.change >= 0 ? "+" : "−"}${Math.abs(q.change).toFixed(2)}%`;

function readCorr(c: number | null, key: string) {
  if (c === null) return "Not enough overlapping sessions";
  const a = Math.abs(c);
  if (a < 0.2) return "Decoupled: BTC is trading on its own drivers";
  if (key === "dxy") return c < 0 ? "Inverse to the dollar: a falling dollar helps" : "Moving with the dollar: unusual, risk-off bid";
  if (key === "gold") return c > 0 ? "Trading like a hedge, alongside gold" : "Moving against gold";
  return a >= 0.5 ? "Trading as a high-beta tech stock: watch Nasdaq" : "Loosely tied to equities";
}

export function CrossAsset({ x, now }: { x: CrossData | null; now: number }) {
  if (!x) return <Skeleton h="14rem" />;
  return (
    <Panel
      title="Live cross-asset"
      aside="Yahoo Finance futures and indices, vs previous session"
      sources={x.sources.filter((s) => !s.ok)}
      footnote="Correlations are of daily returns over the last 30 (and 90) sessions both markets traded; beta is BTC's % move per 1% move in the other market. When a market is closed its tile shows the last print."
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3 lg:grid-cols-5" style={{ borderColor: C.line, background: C.line }}>
        {x.quotes.map((q) => {
          // A rising yield or dollar is the bearish direction for BTC.
          const up = (q.change ?? 0) >= 0;
          const good = q.key === "dxy" || q.key === "us10y" ? !up : up;
          return (
            <div key={q.key} className="flex flex-col gap-0.5 bg-white p-3">
              <span className="mi-label">{q.label}</span>
              <span className="mi-num text-[1.2rem] font-semibold">{fmtLast(q)}</span>
              <span className="mi-num text-[0.85rem]" style={{ color: q.change === null ? C.muted : good ? C.longInk : C.shortInk }}>{fmtChange(q)}</span>
              <span className="text-[0.8rem]" style={{ color: C.muted }}>{q.stale ? `closed, last ${ago(q.t, now)}` : "live"}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {x.correlations.map((c) => (
          <div key={c.key}>
            <div className="mi-label">{c.label}</div>
            <div className="mi-num mt-1 text-[1.2rem] font-semibold">
              {c.corr30 === null ? "n/a" : `${c.corr30 >= 0 ? "+" : "−"}${Math.abs(c.corr30).toFixed(2)}`}
              <span className="ml-2 text-[0.85rem] font-normal" style={{ color: C.muted }}>
                30d{c.corr90 !== null ? `, ${c.corr90 >= 0 ? "+" : "−"}${Math.abs(c.corr90).toFixed(2)} 90d` : ""}{c.beta30 !== null ? `, β ${c.beta30.toFixed(2)}` : ""}
              </span>
            </div>
            <div className="text-[0.85rem]" style={{ color: C.ink2 }}>{readCorr(c.corr30, c.key)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
