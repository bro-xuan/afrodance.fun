"use client";

import { useState, useMemo } from "react";
import { calculatePrincipalPaidInYear } from "../../calculations/mortgage";
import { MORTGAGE_RULES } from "../../data/regulations";

interface Props {
  propertyPrice: number;
  monthlyCostBuying: number;
  estimatedMonthlyRent: number;
  totalOneTimeCosts: number;
  mortgageRate: number;
  annualRentIncrease: number;
  cityAppreciationRate: number;
}

interface Snapshot {
  totalRent: number;
  totalBuyingCosts: number;
  equityBuilt: number;
  netCostBuying: number;
  advantage: number; // positive = buying wins
}

function calculate(
  years: number,
  appreciationRate: number,
  propertyPrice: number,
  monthlyCostBuying: number,
  estimatedMonthlyRent: number,
  totalOneTimeCosts: number,
  mortgageRate: number,
  annualRentIncrease: number,
): Snapshot {
  // Cumulative rent
  let totalRent = 0;
  for (let y = 1; y <= years; y++) {
    totalRent += estimatedMonthlyRent * Math.pow(1 + annualRentIncrease, y - 1) * 12;
  }

  // Cumulative buying costs
  const totalBuyingCosts = totalOneTimeCosts + monthlyCostBuying * 12 * years;

  // Equity: appreciation + principal paid
  const appreciationGain =
    propertyPrice * Math.pow(1 + appreciationRate, years) - propertyPrice;

  let cumulativePrincipal = 0;
  for (let y = 1; y <= years; y++) {
    cumulativePrincipal += calculatePrincipalPaidInYear(
      propertyPrice,
      mortgageRate,
      MORTGAGE_RULES.defaultTermYears,
      y
    );
  }

  const equityBuilt = appreciationGain + cumulativePrincipal;
  const netCostBuying = totalBuyingCosts - equityBuilt;
  const advantage = totalRent - netCostBuying;

  return { totalRent, totalBuyingCosts, equityBuilt, netCostBuying, advantage };
}

function eur(n: number): string {
  return "€" + Math.round(Math.abs(n)).toLocaleString("nl-NL");
}

export function BreakevenExplorer({
  propertyPrice,
  monthlyCostBuying,
  estimatedMonthlyRent,
  totalOneTimeCosts,
  mortgageRate,
  annualRentIncrease,
  cityAppreciationRate,
}: Props) {
  const [years, setYears] = useState(7);
  // Store as integer tenths (e.g., 50 = 5.0%, 51 = 5.1%)
  const [appreciationTenths, setAppreciationTenths] = useState(
    Math.round(cityAppreciationRate * 1000) // e.g., 0.05 → 50
  );

  const appreciation = appreciationTenths / 10; // display value (e.g., 5.0)
  const appreciationRate = appreciationTenths / 1000; // decimal (e.g., 0.05)

  const snapshot = useMemo(
    () =>
      calculate(
        years,
        appreciationRate,
        propertyPrice,
        monthlyCostBuying,
        estimatedMonthlyRent,
        totalOneTimeCosts,
        mortgageRate,
        annualRentIncrease,
      ),
    [years, appreciationRate, propertyPrice, monthlyCostBuying, estimatedMonthlyRent, totalOneTimeCosts, mortgageRate, annualRentIncrease]
  );

  // Generate data for mini bar chart (years 1-15)
  const yearSnapshots = useMemo(() => {
    const out: { year: number; advantage: number }[] = [];
    for (let y = 1; y <= 20; y++) {
      const s = calculate(
        y,
        appreciationRate,
        propertyPrice,
        monthlyCostBuying,
        estimatedMonthlyRent,
        totalOneTimeCosts,
        mortgageRate,
        annualRentIncrease,
      );
      out.push({ year: y, advantage: s.advantage });
    }
    return out;
  }, [appreciationRate, propertyPrice, monthlyCostBuying, estimatedMonthlyRent, totalOneTimeCosts, mortgageRate, annualRentIncrease]);

  const maxAbs = Math.max(...yearSnapshots.map((s) => Math.abs(s.advantage)), 1);
  const buyingWins = snapshot.advantage >= 0;

  // Find breakeven year at current appreciation
  const breakevenYear = yearSnapshots.find((s) => s.advantage >= 0)?.year ?? null;

  return (
    <div
      className="bg-white rounded-[20px] p-6 sm:p-8"
      style={{
        boxShadow:
          "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
      }}
    >
      <h3
        className="text-lg font-semibold text-[#222222] mb-1"
        style={{ letterSpacing: "-0.18px" }}
      >
        Buy vs Rent Explorer
      </h3>
      <p className="text-xs text-[#6a6a6a] mb-6">
        Drag the sliders to see how time and market growth affect your decision.
      </p>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm font-medium text-[#222222]">
              Years in the property
            </label>
            <span className="text-lg font-bold text-[#222222]">{years}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value))}
            className="w-full h-2 bg-[#e8e8e8] rounded-lg appearance-none cursor-pointer accent-[#222222]"
          />
          <div className="flex justify-between text-[10px] text-[#6a6a6a] mt-1">
            <span>1 yr</span>
            <span>20 yrs</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm font-medium text-[#222222]">
              Annual appreciation
            </label>
            <span className="text-lg font-bold text-[#222222]">{appreciation.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={-20}
            max={100}
            step={1}
            value={appreciationTenths}
            onChange={(e) => setAppreciationTenths(parseInt(e.target.value))}
            className="w-full h-2 bg-[#e8e8e8] rounded-lg appearance-none cursor-pointer accent-[#222222]"
          />
          <div className="flex justify-between text-[10px] text-[#6a6a6a] mt-1">
            <span>-2% (decline)</span>
            <span>10%</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div
        className={`rounded-xl p-5 mb-6 text-center ${
          buyingWins ? "bg-[#f0faf0]" : "bg-[#fff0f0]"
        }`}
      >
        <p className="text-xs text-[#6a6a6a] mb-1">
          After {years} year{years > 1 ? "s" : ""} with {appreciation.toFixed(1)}% annual growth
        </p>
        <p
          className={`text-2xl sm:text-3xl font-bold ${
            buyingWins ? "text-[#008a05]" : "text-[#c13515]"
          }`}
        >
          {buyingWins ? "Buying saves " : "Renting saves "}
          {eur(snapshot.advantage)}
        </p>
        <p className="text-xs text-[#6a6a6a] mt-2">
          {buyingWins
            ? "You build equity that outweighs the higher costs of buying."
            : "The costs of buying haven't been recovered yet. You'd be better off renting."}
        </p>
        {breakevenYear !== null && (
          <p className="text-xs font-medium text-[#222222] mt-1">
            Break-even at {appreciation.toFixed(1)}% growth: year {breakevenYear}
          </p>
        )}
        {breakevenYear === null && (
          <p className="text-xs font-medium text-[#c13515] mt-1">
            At {appreciation.toFixed(1)}% growth, buying doesn&apos;t break even within 20 years
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#f7f7f7] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#6a6a6a] mb-0.5">Total rent paid</p>
          <p className="text-sm font-bold text-[#ff385c]">{eur(snapshot.totalRent)}</p>
        </div>
        <div className="bg-[#f7f7f7] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#6a6a6a] mb-0.5">Total buying costs</p>
          <p className="text-sm font-bold text-[#222222]">{eur(snapshot.totalBuyingCosts)}</p>
        </div>
        <div className="bg-[#f7f7f7] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#6a6a6a] mb-0.5">Equity built</p>
          <p className="text-sm font-bold text-[#008a05]">{eur(snapshot.equityBuilt)}</p>
        </div>
        <div className="bg-[#f7f7f7] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#6a6a6a] mb-0.5">Net cost of buying</p>
          <p className="text-sm font-bold text-[#222222]">{eur(snapshot.netCostBuying)}</p>
        </div>
      </div>

      {/* Timeline chart */}
      <h4 className="text-sm font-semibold text-[#222222] mb-3">
        Year-by-year at {appreciation.toFixed(1)}% growth
      </h4>
      <div className="space-y-1.5">
        {yearSnapshots.map((s) => {
          const isSelected = s.year === years;
          const isPositive = s.advantage >= 0;
          const barWidth = Math.max(2, (Math.abs(s.advantage) / maxAbs) * 100);

          return (
            <button
              key={s.year}
              onClick={() => setYears(s.year)}
              className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1 transition-all ${
                isSelected ? "bg-[#f2f2f2]" : "hover:bg-[#fafafa]"
              }`}
            >
              <span
                className={`text-xs w-8 text-right shrink-0 ${
                  isSelected ? "font-bold text-[#222222]" : "text-[#6a6a6a]"
                }`}
              >
                Y{s.year}
              </span>
              <div className="flex-1 flex items-center">
                {/* Center divider approach: bars grow from center */}
                <div className="flex-1 flex justify-end">
                  {!isPositive && (
                    <div
                      className="h-4 rounded-l bg-[#ff385c] transition-all duration-300"
                      style={{ width: `${barWidth}%`, minWidth: "2px" }}
                    />
                  )}
                </div>
                <div className="w-px h-5 bg-[#c1c1c1] shrink-0" />
                <div className="flex-1">
                  {isPositive && (
                    <div
                      className="h-4 rounded-r bg-[#008a05] transition-all duration-300"
                      style={{ width: `${barWidth}%`, minWidth: "2px" }}
                    />
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] w-20 text-right shrink-0 ${
                  isPositive ? "text-[#008a05]" : "text-[#ff385c]"
                } ${isSelected ? "font-bold" : ""}`}
              >
                {isPositive ? "+" : "-"}
                {eur(s.advantage)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#008a05]" />
          <span className="text-[10px] text-[#6a6a6a]">Buying wins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#ff385c]" />
          <span className="text-[10px] text-[#6a6a6a]">Renting wins</span>
        </div>
      </div>
    </div>
  );
}
