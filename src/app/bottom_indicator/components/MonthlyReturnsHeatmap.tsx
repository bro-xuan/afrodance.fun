/**
 * Calendar heatmap of monthly BTC returns (year × month) with a seasonality
 * row (average per month) — the chart behind "Q4 bottoms" and "October is
 * usually green". Pure SSR table: every value is visible, colour is extra.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "16,185,129"; // phase Bottom hex #10b981
const RED = "239,68,68";    // phase Top hex #ef4444

function cellBg(v: number | null): string | undefined {
  if (v === null) return undefined;
  const a = Math.min(1, Math.abs(v) / 40) * 0.55 + 0.05;
  return `rgba(${v >= 0 ? GREEN : RED},${a.toFixed(2)})`;
}

export function MonthlyReturnsHeatmap({ data }: { data: Record<string, (number | null)[]> }) {
  const years = Object.keys(data).sort();
  const avg = MONTHS.map((_, m) => {
    const vals = years.map((y) => data[y][m]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  const wins = MONTHS.map((_, m) => {
    const vals = years.map((y) => data[y][m]).filter((v): v is number => v !== null);
    return vals.length ? Math.round((vals.filter((v) => v > 0).length / vals.length) * 100) : null;
  });
  const bestMonth = avg.indexOf(Math.max(...avg.map((v) => v ?? -Infinity)));
  const worstMonth = avg.indexOf(Math.min(...avg.map((v) => v ?? Infinity)));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-[2px] text-center text-[11.5px] tabular-nums"
          aria-label="Monthly Bitcoin returns by year">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <th className="py-1 text-left font-medium">Year</th>
              {MONTHS.map((m) => <th key={m} className="py-1 font-medium">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y}>
                <th scope="row" className="py-0.5 text-left font-medium text-[#8695ac]">{y}</th>
                {data[y].map((v, m) => (
                  <td key={m} className="rounded px-1 py-1 text-[#e6edf5]" style={{ background: cellBg(v) }}
                    title={v === null ? undefined : `${MONTHS[m]} ${y}: ${v > 0 ? "+" : ""}${v}%`}>
                    {v === null ? <span className="text-[#2a3648]">·</span> : `${v > 0 ? "+" : ""}${Math.round(v)}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[rgba(255,255,255,0.1)]">
              <th scope="row" className="pt-2 text-left font-semibold text-[#c7d0de]">Avg</th>
              {avg.map((v, m) => (
                <td key={m} className="rounded px-1 pt-2 font-semibold text-[#f2f6fb]" style={{ background: cellBg(v) }}>
                  {v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="pt-1 text-left text-[#8695ac]">% green</th>
              {wins.map((v, m) => <td key={m} className="pt-1 text-[#8695ac]">{v === null ? "—" : `${v}%`}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#8695ac]">
        Month-end close vs prior month-end, {years[0]}–{years[years.length - 1]}. Historically the strongest month is{" "}
        <span className="text-[#c7d0de]">{MONTHS[bestMonth]}</span> (avg {avg[bestMonth]! > 0 ? "+" : ""}{avg[bestMonth]!.toFixed(1)}%) and the
        weakest is <span className="text-[#c7d0de]">{MONTHS[worstMonth]}</span> (avg {avg[worstMonth]!.toFixed(1)}%). Each past cycle low
        landed in Q4 of a mid-term year (Jan 2015 aside).
      </p>
    </div>
  );
}
