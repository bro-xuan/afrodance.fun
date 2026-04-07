import type { CostBreakdown } from "../../types";

interface Props {
  costs: CostBreakdown;
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

export function CostBreakdownPanel({ costs }: Props) {
  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <h3 className="text-lg font-semibold text-[#222222] mb-4" style={{ letterSpacing: "-0.18px" }}>
        Cost Breakdown
      </h3>

      {/* One-time costs */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-[#222222] mb-2 uppercase tracking-wide">
          One-time costs (kosten koper)
        </h4>
        <div className="space-y-0">
          <Row label="Transfer tax (overdrachtsbelasting)" value={eur(costs.transferTax)} />
          <Row label="Notary fees" value={eur(costs.notaryFees)} />
          <Row label="Property appraisal (taxatie)" value={eur(costs.appraisalFees)} />
          <Row label="Mortgage origination" value={eur(costs.mortgageOriginationFees)} />
          {costs.nhgPremium > 0 && (
            <Row label="NHG premium" value={eur(costs.nhgPremium)} />
          )}
          <div className="flex justify-between items-center py-3 border-t-2 border-[#222222]">
            <span className="text-sm font-bold text-[#222222]">Total one-time</span>
            <span className="text-base font-bold text-[#222222]">{eur(costs.totalOneTime)}</span>
          </div>
        </div>
      </div>

      {/* Monthly costs */}
      <div>
        <h4 className="text-sm font-semibold text-[#222222] mb-2 uppercase tracking-wide">
          Monthly costs
        </h4>
        <div className="space-y-0">
          <Row label="Mortgage payment (annuity)" value={eur(costs.mortgagePayment)} />
          {costs.vveCosts > 0 && (
            <Row label="VvE (homeowners association)" value={eur(costs.vveCosts)} />
          )}
          {costs.maintenanceReserve > 0 && (
            <Row label="Maintenance reserve (1%/yr)" value={eur(costs.maintenanceReserve)} />
          )}
          <Row label="OZB (property tax)" value={eur(costs.ozbEstimate)} />
          <Row label="Waterschapsbelasting (water authority)" value={eur(costs.waterschapsbelasting)} />
          <Row label="Rioolheffing (sewage)" value={eur(costs.rioolheffing)} />
          <div className="flex justify-between items-center py-3 border-t border-[#e8e8e8]">
            <span className="text-sm font-semibold text-[#6a6a6a]">Gross monthly</span>
            <span className="text-sm font-semibold text-[#6a6a6a]">{eur(costs.totalMonthlyGross)}</span>
          </div>
          {costs.taxBenefit > 0 && (
            <Row label="Net tax benefit (interest aftrek − eigenwoningforfait)" value={`-${eur(costs.taxBenefit)}`} highlight />
          )}
          <div className="flex justify-between items-center py-3 border-t-2 border-[#222222]">
            <span className="text-sm font-bold text-[#222222]">Net monthly cost</span>
            <span className="text-base font-bold text-[#222222]">{eur(costs.totalMonthlyNet)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#f2f2f2]">
      <span className="text-sm text-[#6a6a6a]">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-[#008a05]" : "text-[#222222]"}`}>
        {value}
      </span>
    </div>
  );
}
