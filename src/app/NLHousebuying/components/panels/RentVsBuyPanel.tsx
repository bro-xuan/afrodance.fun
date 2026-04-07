import { useState, useEffect } from "react";
import type { RentVsBuyResult } from "../../types";

interface Props {
  result: RentVsBuyResult;
  cityName: string;
  rentOverride: number | null;
  onRentOverrideChange: (value: number | null) => void;
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

export function RentVsBuyPanel({ result, cityName, rentOverride, onRentOverrideChange }: Props) {
  const maxCumulative = Math.max(
    ...result.yearlyComparison.map((y) => Math.max(y.cumulativeRent, y.cumulativeBuy))
  );

  const rentCheaper = result.monthlyCostBuying > result.estimatedMonthlyRent;
  const monthlyDiff = Math.abs(result.monthlyCostBuying - result.estimatedMonthlyRent);

  const [editing, setEditing] = useState(false);
  const [rentInput, setRentInput] = useState("");

  useEffect(() => {
    setRentInput(rentOverride !== null ? String(rentOverride) : "");
  }, [rentOverride]);

  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <h3 className="text-lg font-semibold text-[#222222] mb-4" style={{ letterSpacing: "-0.18px" }}>
        Rent vs Buy Comparison
      </h3>

      {/* Monthly comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#f7f7f7] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#6a6a6a]">Est. rent in {cityName}</p>
            <button
              onClick={() => setEditing(!editing)}
              className="text-[10px] text-[#6a6a6a] hover:text-[#222222] underline"
            >
              {editing ? "done" : "edit"}
            </button>
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[#6a6a6a]">€</span>
              <input
                type="text"
                inputMode="numeric"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  const val = parseInt(rentInput, 10) || 0;
                  onRentOverrideChange(val > 0 ? val : null);
                }}
                placeholder={String(result.estimatedMonthlyRent)}
                autoFocus
                className="w-full px-2 py-1 border border-[#c1c1c1] rounded-lg text-[#ff385c] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#ff385c]"
              />
            </div>
          ) : (
            <p className="text-xl font-bold text-[#ff385c]">{eur(result.estimatedMonthlyRent)}</p>
          )}
          {rentOverride !== null && !editing && (
            <button
              onClick={() => onRentOverrideChange(null)}
              className="text-[10px] text-[#ff385c] hover:underline mt-0.5"
            >
              reset to city average
            </button>
          )}
          {rentOverride === null && !editing && (
            <p className="text-[10px] text-[#6a6a6a] mt-0.5">based on {cityName} avg</p>
          )}
        </div>
        <div className="bg-[#f7f7f7] rounded-xl p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Monthly cost (buying)</p>
          <p className="text-xl font-bold text-[#222222]">{eur(result.monthlyCostBuying)}</p>
          <p className="text-[10px] text-[#008a05] mt-0.5">incl. hypotheekrenteaftrek</p>
        </div>
      </div>

      <div className={`p-3 rounded-lg mb-6 ${rentCheaper ? "bg-[#fff8f0]" : "bg-[#f0faf0]"}`}>
        <p className={`text-sm font-medium ${rentCheaper ? "text-[#e07912]" : "text-[#008a05]"}`}>
          {rentCheaper
            ? `Buying costs ${eur(monthlyDiff)}/mo more than renting`
            : `Buying saves ${eur(monthlyDiff)}/mo compared to renting`}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-2xl font-bold text-[#222222]">
            {result.breakEvenYears > 10 ? "10+" : result.breakEvenYears}
          </p>
          <p className="text-xs text-[#6a6a6a]">Break-even (years)</p>
        </div>
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-lg font-bold text-[#ff385c]">{eur(result.npv10YearRent)}</p>
          <p className="text-xs text-[#6a6a6a]">10yr NPV (rent)</p>
        </div>
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-lg font-bold text-[#222222]">{eur(result.npv10YearBuy)}</p>
          <p className="text-xs text-[#6a6a6a]">10yr NPV (buy)</p>
        </div>
      </div>

      {/* Interest rate sensitivity */}
      {result.rateSensitivity.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[#222222] mb-3">
            Interest Rate Sensitivity
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {result.rateSensitivity.map((s) => (
              <div
                key={s.rate}
                className={`text-center p-3 rounded-xl border ${
                  s.rate === 0.04
                    ? "bg-[#f7f7f7] border-[#222222]"
                    : "bg-[#fafafa] border-[#f2f2f2]"
                }`}
              >
                <p className="text-xs text-[#6a6a6a] mb-1">
                  {(s.rate * 100).toFixed(1)}% rate
                </p>
                <p className="text-lg font-bold text-[#222222]">
                  {s.breakEvenYears > 10 ? "10+" : s.breakEvenYears}
                  <span className="text-xs font-normal text-[#6a6a6a]"> yr</span>
                </p>
                <p className="text-[10px] text-[#6a6a6a]">{eur(s.monthlyCost)}/mo</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10-year cumulative chart */}
      <h4 className="text-sm font-semibold text-[#222222] mb-3">
        10-Year Cumulative Cost
      </h4>
      <div className="space-y-3">
        {result.yearlyComparison.map((yr) => (
          <div key={yr.year} className="flex items-center gap-3">
            <span className="text-xs text-[#6a6a6a] w-6 text-right shrink-0">
              Y{yr.year}
            </span>
            <div className="flex-1 space-y-1">
              {/* Rent bar */}
              <div className="flex items-center gap-2">
                <div
                  className="h-3 rounded bg-[#ff385c] transition-all duration-500"
                  style={{ width: `${(yr.cumulativeRent / maxCumulative) * 100}%`, minWidth: "4px" }}
                />
                <span className="text-[10px] text-[#6a6a6a] whitespace-nowrap">
                  {eur(yr.cumulativeRent)}
                </span>
              </div>
              {/* Buy bar */}
              <div className="flex items-center gap-2">
                <div
                  className="h-3 rounded bg-[#222222] transition-all duration-500"
                  style={{ width: `${(yr.cumulativeBuy / maxCumulative) * 100}%`, minWidth: "4px" }}
                />
                <span className="text-[10px] text-[#6a6a6a] whitespace-nowrap">
                  {eur(yr.cumulativeBuy)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#ff385c]" />
          <span className="text-xs text-[#6a6a6a]">Cumulative rent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#222222]" />
          <span className="text-xs text-[#6a6a6a]">Cumulative buy costs</span>
        </div>
      </div>
    </div>
  );
}
