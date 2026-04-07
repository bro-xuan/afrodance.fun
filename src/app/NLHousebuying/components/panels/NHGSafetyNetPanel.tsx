import type { MortgageResult, RegulationYear } from "../../types";
import { REGULATIONS } from "../../data/regulations";

interface Props {
  mortgage: MortgageResult;
  propertyPrice: number;
  year: RegulationYear;
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

const FORCED_SALE_STEPS = [
  {
    step: "1",
    title: "You fall behind on payments",
    description:
      "Life happens. Job loss, divorce, disability, or a partner passing away. You can no longer afford your monthly mortgage payments.",
  },
  {
    step: "2",
    title: "You contact your lender",
    description:
      "Your bank works with you on a payment arrangement first. NHG requires the lender to explore alternatives (payment pause, extended term, interest-only period) before forcing a sale.",
  },
  {
    step: "3",
    title: "The house must be sold",
    description:
      "If no arrangement works, the property goes on the market. In a down market, your house might sell for less than what you still owe on your mortgage.",
  },
  {
    step: "4",
    title: "Restschuld (residual debt) arises",
    description:
      'Say you owe €380.000 but your house sells for €340.000. The €40.000 gap is your "restschuld." Without NHG, you\'d owe this out of pocket, on top of having no house.',
  },
  {
    step: "5",
    title: "NHG covers the restschuld",
    description:
      "If the forced sale was caused by circumstances beyond your control (not neglect or fraud), NHG pays the lender the difference. You walk away without that €40.000 debt hanging over you.",
  },
];

const NHG_REQUIREMENTS = [
  {
    icon: "🏠",
    title: "Owner-occupied only",
    description:
      "The property must be your primary residence (hoofdverblijf). NHG does not cover investment properties or buy-to-let.",
  },
  {
    icon: "💰",
    title: "Below the NHG price limit",
    description: null, // filled dynamically
  },
  {
    icon: "📋",
    title: "Nibud income norms",
    description:
      "Your mortgage must comply with Nibud (National Institute for Family Finance Information) affordability guidelines. Your hypotheekadviseur calculates this.",
  },
  {
    icon: "🔑",
    title: "Annuity or linear mortgage only",
    description:
      "NHG only covers full-repayment mortgages (annuity or linear). Interest-only mortgages do not qualify.",
  },
  {
    icon: "🏗️",
    title: "Energy improvements count",
    description:
      "If you add energy-saving improvements (isolation, solar panels, heat pump), you can borrow up to 106% of the property value under NHG, instead of the standard 100%.",
  },
];

const NHG_DOCUMENTS = [
  { doc: "Valid ID", detail: "Passport or ID card (no driver's license)" },
  {
    doc: "Income proof",
    detail:
      "Werkgeversverklaring (employer declaration) + 3 recent payslips, or 3 years of tax returns for ZZP",
  },
  {
    doc: "Mortgage application",
    detail:
      "Your hypotheekadviseur files the NHG application as part of the mortgage process",
  },
  {
    doc: "Property appraisal",
    detail:
      "A NWWI-certified taxatierapport (appraisal report) confirming the property value",
  },
  {
    doc: "Purchase agreement",
    detail:
      "Signed koopovereenkomst (purchase contract) showing the price is within NHG limits",
  },
  {
    doc: "BKR credit check",
    detail:
      "Clean credit registration at BKR (Bureau Krediet Registratie). Outstanding negative registrations can block NHG",
  },
];

const COVERED_CAUSES = [
  "Involuntary unemployment (onvrijwillige werkloosheid)",
  "Disability or long-term illness (arbeidsongeschiktheid)",
  "Divorce or end of registered partnership",
  "Death of a partner",
  "Relationship breakdown with documented income impact",
];

const NOT_COVERED = [
  "Voluntary job change with lower income",
  "Neglected maintenance that reduced property value",
  "Fraud or misrepresentation on the mortgage application",
  "Investment properties or second homes",
  "Mortgage arrears without engaging with your lender first",
];

export function NHGSafetyNetPanel({ mortgage, propertyPrice, year }: Props) {
  const regs = REGULATIONS[year];
  const isEligible = mortgage.nhgEligible;
  const limit = regs.nhgLimit;
  const premium = regs.nhgPremiumRate * 100;
  const premiumAmount = isEligible ? propertyPrice * regs.nhgPremiumRate : 0;

  return (
    <div
      className="bg-white rounded-[20px] p-6 sm:p-8"
      style={{
        boxShadow:
          "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🛡️</span>
        <h3
          className="text-lg font-semibold text-[#222222]"
          style={{ letterSpacing: "-0.18px" }}
        >
          NHG Safety Net: What If You Can&apos;t Pay?
        </h3>
      </div>
      <p className="text-sm text-[#6a6a6a] mb-6">
        Nationale Hypotheek Garantie is the Dutch government-backed mortgage
        guarantee. It protects you if life forces you to sell your home at a
        loss. Here&apos;s exactly how it works.
      </p>

      {/* Eligibility banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
          isEligible ? "bg-[#f0faf0]" : "bg-[#fff8f0]"
        }`}
      >
        <span className="text-2xl">{isEligible ? "✅" : "⚠️"}</span>
        <div>
          <p
            className={`text-sm font-semibold ${
              isEligible ? "text-[#008a05]" : "text-[#e07912]"
            }`}
          >
            {isEligible
              ? `Your property (${eur(propertyPrice)}) qualifies for NHG`
              : `Your property (${eur(propertyPrice)}) exceeds the NHG limit`}
          </p>
          <p className="text-xs text-[#6a6a6a] mt-0.5">
            {year} NHG limit: {eur(limit)}
            {isEligible
              ? ` — one-time premium: ${eur(premiumAmount)} (${premium}% of property price, tax-deductible)`
              : ` — your property is ${eur(propertyPrice - limit)} above the limit`}
          </p>
        </div>
      </div>

      {/* Section 1: Forced sale scenario */}
      <div className="mb-8">
        <h4
          className="text-sm font-semibold text-[#222222] mb-1"
          style={{ letterSpacing: "-0.18px" }}
        >
          The Forced Sale Scenario, Step by Step
        </h4>
        <p className="text-xs text-[#6a6a6a] mb-4">
          What actually happens when you can&apos;t keep up with your mortgage
          and NHG is in place.
        </p>
        <div className="space-y-0">
          {FORCED_SALE_STEPS.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {item.step}
                  </span>
                </div>
                {i < FORCED_SALE_STEPS.length - 1 && (
                  <div className="w-0.5 bg-[#e2e2e2] flex-1 min-h-[16px]" />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium text-[#222222]">
                  {item.title}
                </p>
                <p className="text-xs text-[#6a6a6a] mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: What's covered vs not */}
      <div className="mb-8">
        <h4
          className="text-sm font-semibold text-[#222222] mb-3"
          style={{ letterSpacing: "-0.18px" }}
        >
          When Does NHG Actually Pay?
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#f0faf0] rounded-xl">
            <p className="text-xs font-semibold text-[#008a05] mb-2 uppercase tracking-wide">
              Covered causes
            </p>
            <ul className="space-y-2">
              {COVERED_CAUSES.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#008a05] mt-0.5 shrink-0 text-xs">
                    ✓
                  </span>
                  <span className="text-xs text-[#222222]">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-[#fff0f0] rounded-xl">
            <p className="text-xs font-semibold text-[#c13515] mb-2 uppercase tracking-wide">
              Not covered
            </p>
            <ul className="space-y-2">
              {NOT_COVERED.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#c13515] mt-0.5 shrink-0 text-xs">
                    ✗
                  </span>
                  <span className="text-xs text-[#222222]">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Requirements */}
      <div className="mb-8">
        <h4
          className="text-sm font-semibold text-[#222222] mb-3"
          style={{ letterSpacing: "-0.18px" }}
        >
          Requirements to Get NHG
        </h4>
        <div className="space-y-3">
          {NHG_REQUIREMENTS.map((req, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-[#f7f7f7] rounded-lg"
            >
              <span className="text-lg shrink-0">{req.icon}</span>
              <div>
                <p className="text-sm font-medium text-[#222222]">
                  {req.title}
                </p>
                <p className="text-xs text-[#6a6a6a] mt-0.5">
                  {req.description ??
                    `The total property cost (including energy improvements) must be ${eur(limit)} or less in ${year}. Your property: ${eur(propertyPrice)}.`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Documents checklist */}
      <div className="mb-6">
        <h4
          className="text-sm font-semibold text-[#222222] mb-1"
          style={{ letterSpacing: "-0.18px" }}
        >
          Documents You&apos;ll Need
        </h4>
        <p className="text-xs text-[#6a6a6a] mb-3">
          Your hypotheekadviseur (mortgage advisor) handles the NHG application,
          but you need to provide these documents.
        </p>
        <div className="space-y-0">
          {NHG_DOCUMENTS.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-3 border-b border-[#f2f2f2] last:border-0"
            >
              <div className="w-6 h-6 rounded-md bg-[#f2f2f2] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#6a6a6a]">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#222222]">
                  {item.doc}
                </p>
                <p className="text-xs text-[#6a6a6a] mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key numbers callout */}
      <div className="p-4 bg-[#f7f7f7] rounded-xl mb-6">
        <p className="text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wide">
          Key NHG numbers for {year}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-lg font-bold text-[#222222]">{eur(limit)}</p>
            <p className="text-[10px] text-[#6a6a6a]">Price limit</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#222222]">{premium}%</p>
            <p className="text-[10px] text-[#6a6a6a]">One-time premium</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#222222]">~0.1-0.3%</p>
            <p className="text-[10px] text-[#6a6a6a]">Rate discount</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#222222]">106%</p>
            <p className="text-[10px] text-[#6a6a6a]">Max LTV (with energy)</p>
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="p-4 bg-[#eef5ff] rounded-xl">
        <p className="text-xs text-[#428bff] font-medium mb-1">
          💡 Why NHG is worth it even if you never need it
        </p>
        <p className="text-xs text-[#6a6a6a]">
          Beyond the safety net, NHG-backed mortgages typically get a 0.1-0.3%
          lower interest rate from lenders, because the bank&apos;s risk is
          lower. On a {eur(limit)} mortgage at 4%, that saves you roughly{" "}
          {eur(Math.round((limit * 0.002) / 12))}-
          {eur(Math.round((limit * 0.003) / 12))}/mo. The one-time premium of{" "}
          {eur(Math.round(limit * regs.nhgPremiumRate))} is also fully
          tax-deductible in the year you buy. For most buyers, NHG pays for
          itself within 2-3 years through the rate discount alone.
        </p>
      </div>
    </div>
  );
}
