import { useState, useEffect } from "react";
import type { MortgageResult, CalculationOverrides } from "../../types";

interface Props {
  result: MortgageResult;
  hasPartner: boolean;
  overrides: CalculationOverrides;
  onOverrideChange: (payload: Partial<CalculationOverrides>) => void;
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

function formatNL(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

function parseNum(str: string): number {
  return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
}

function EuroInput({ value, onChange, placeholder }: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (!focused) {
      setRaw(value !== null ? String(value) : "");
    }
  }, [value, focused]);

  const display = focused ? raw : (value !== null ? formatNL(value) : "");

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-xs">€</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onFocus={() => {
          setFocused(true);
          setRaw(value !== null ? String(value) : "");
        }}
        onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => {
          setFocused(false);
          const val = parseNum(raw);
          onChange(val > 0 ? val : null);
        }}
        placeholder={placeholder}
        className="w-full pl-7 pr-2 py-2 border border-[#c1c1c1] rounded-lg text-[#222222] text-xs focus:outline-none focus:ring-2 focus:ring-[#222222]"
      />
    </div>
  );
}

function RateInput({ value, onChange }: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (!focused) {
      setRaw(value !== null ? (value * 100).toFixed(1) : "");
    }
  }, [value, focused]);

  const display = focused ? raw : (value !== null ? (value * 100).toFixed(1) : "");

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setFocused(true);
        setRaw(value !== null ? (value * 100).toFixed(1) : "");
      }}
      onChange={(e) => {
        // Allow digits, dot, and comma
        setRaw(e.target.value.replace(/[^0-9.,]/g, ""));
      }}
      onBlur={() => {
        setFocused(false);
        // Accept both comma and dot as decimal separator
        const normalized = raw.replace(",", ".");
        const val = parseFloat(normalized);
        onChange(val > 0 && val <= 15 ? val / 100 : null);
      }}
      placeholder="4.0"
      className="w-full px-3 py-2 border border-[#c1c1c1] rounded-lg text-[#222222] text-xs focus:outline-none focus:ring-2 focus:ring-[#222222]"
    />
  );
}

export function MortgagePanel({ result, hasPartner, overrides, onOverrideChange }: Props) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#222222]" style={{ letterSpacing: "-0.18px" }}>
          Mortgage Capacity
        </h3>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
            editMode
              ? "bg-[#222222] text-white"
              : "bg-[#f2f2f2] text-[#6a6a6a] hover:text-[#222222]"
          }`}
        >
          {editMode ? "Done editing" : "Edit values"}
        </button>
      </div>

      {editMode && (
        <div className="mb-5 p-4 bg-[#fff8f0] rounded-xl border border-[#fde2c8]">
          <p className="text-xs text-[#9c5700] mb-3">
            <strong>Consultant override:</strong> If your mortgage advisor gave you different numbers, enter them below. These will override the calculated values.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#6a6a6a] uppercase tracking-wide mb-1">Max mortgage</label>
              <EuroInput
                value={overrides.maxMortgage}
                onChange={(v) => onOverrideChange({ maxMortgage: v })}
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#6a6a6a] uppercase tracking-wide mb-1">Interest rate (%)</label>
              <RateInput
                value={overrides.interestRate}
                onChange={(v) => onOverrideChange({ interestRate: v })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#6a6a6a] uppercase tracking-wide mb-1">Monthly payment</label>
              <EuroInput
                value={overrides.monthlyPayment}
                onChange={(v) => onOverrideChange({ monthlyPayment: v })}
                placeholder="Auto"
              />
            </div>
          </div>
          {(overrides.maxMortgage !== null || overrides.interestRate !== null || overrides.monthlyPayment !== null) && (
            <button
              onClick={() => onOverrideChange({ maxMortgage: null, interestRate: null, monthlyPayment: null })}
              className="mt-2 text-xs text-[#ff385c] hover:underline"
            >
              Reset to calculated values
            </button>
          )}
        </div>
      )}

      {result.isOverridden && !editMode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-[#e07912]">
          <span>⚡</span>
          <span>Using consultant-provided values (click &quot;Edit values&quot; to modify)</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#f7f7f7] rounded-xl p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Max mortgage {result.isOverridden ? "(overridden)" : "(single)"}</p>
          <p className="text-xl font-bold text-[#222222]">{eur(result.isOverridden ? result.effectiveMaxMortgage : result.maxMortgageSingle)}</p>
        </div>
        {hasPartner && result.maxMortgageWithPartner !== null && !result.isOverridden && (
          <div className="bg-[#f7f7f7] rounded-xl p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Max mortgage (with partner)</p>
            <p className="text-xl font-bold text-[#222222]">{eur(result.maxMortgageWithPartner)}</p>
          </div>
        )}
      </div>

      {/* Can finance indicator */}
      <div className={`flex items-center gap-3 p-4 rounded-xl mb-5 ${
        result.canFinance ? "bg-[#f0faf0]" : "bg-[#fff0f0]"
      }`}>
        <span className="text-2xl">{result.canFinance ? "✅" : "⚠️"}</span>
        <div>
          <p className={`text-sm font-semibold ${result.canFinance ? "text-[#008a05]" : "text-[#c13515]"}`}>
            {result.canFinance
              ? "You can finance this property"
              : `Shortfall: ${eur(result.shortfall)}`}
          </p>
          <p className="text-xs text-[#6a6a6a] mt-0.5">LTV: {result.ltv.toFixed(0)}%</p>
        </div>
      </div>

      {/* Details table */}
      <div className="space-y-0">
        <Row label="Gross monthly payment (annuity)" value={`${eur(result.estimatedMonthlyPaymentAnnuity)}/mo`} />
        {result.monthlyTaxBenefit > 0 && (
          <Row label="Tax deduction (hypotheekrenteaftrek)" value={`-${eur(result.monthlyTaxBenefit)}/mo`} highlight />
        )}
        <div className="flex justify-between items-center py-3 border-b border-[#f2f2f2]">
          <span className="text-sm font-semibold text-[#222222]">Net monthly mortgage payment</span>
          <span className="text-sm font-bold text-[#222222]">{eur(result.netMonthlyPayment)}/mo</span>
        </div>
        <Row label="Monthly payment (linear, initial)" value={`${eur(result.estimatedMonthlyPaymentLinear)}/mo`} />
        <Row label="Interest rate" value={`${(result.interestRate * 100).toFixed(1)}% (30-year fixed est.)`} />
        <Row
          label="NHG eligible"
          value={result.nhgEligible ? `Yes — limit ${eur(result.nhgLimit)}` : `No — exceeds ${eur(result.nhgLimit)}`}
          highlight={result.nhgEligible}
        />
        {result.nhgEligible && (
          <Row label="NHG premium (one-time)" value={eur(result.nhgPremium)} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#f2f2f2] last:border-0">
      <span className="text-sm text-[#6a6a6a]">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-[#008a05]" : "text-[#222222]"}`}>
        {value}
      </span>
    </div>
  );
}
