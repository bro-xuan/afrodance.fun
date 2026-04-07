import type { PurposeGoals, Purpose, StayDuration, RiskTolerance } from "../types";
import { CITY_OPTIONS, CITIES } from "../data/cities";

interface Props {
  data: PurposeGoals;
  onChange: (payload: Partial<PurposeGoals>) => void;
  onBack: () => void;
  onNext: () => void;
}

const PURPOSE_OPTIONS: { value: Purpose; label: string; emoji: string; desc: string }[] = [
  { value: "self-living", label: "Self-living", emoji: "🏡", desc: "Primary residence for yourself / family" },
  { value: "investment", label: "Investment", emoji: "📈", desc: "Long-term capital appreciation" },
  { value: "buy-to-let", label: "Buy-to-let", emoji: "🔑", desc: "Rent it out (verhuur)" },
];

const DURATION_OPTIONS: { value: StayDuration; label: string }[] = [
  { value: "<3y", label: "Less than 3 years" },
  { value: "3-5y", label: "3 - 5 years" },
  { value: "5-10y", label: "5 - 10 years" },
  { value: "10+y", label: "10+ years" },
];

const RISK_OPTIONS: { value: RiskTolerance; label: string; color: string; desc: string }[] = [
  { value: "low", label: "Conservative", color: "#008a05", desc: "Prefer stability, minimal risk" },
  { value: "medium", label: "Moderate", color: "#e07912", desc: "Some risk for better returns" },
  { value: "high", label: "Aggressive", color: "#c13515", desc: "Comfortable with market volatility" },
];

const TIGHTNESS_LABELS = {
  extremely_tight: { label: "Extremely Tight", color: "#c13515" },
  tight: { label: "Tight", color: "#e07912" },
  moderate: { label: "Moderate", color: "#008a05" },
  loose: { label: "Loose", color: "#428bff" },
};

function togglePurpose(current: Purpose[], value: Purpose): Purpose[] {
  if (current.includes(value)) {
    // Don't allow deselecting the last purpose
    if (current.length === 1) return current;
    return current.filter((p) => p !== value);
  }
  return [...current, value];
}

export function StepPurposeGoals({ data, onChange, onBack, onNext }: Props) {
  const selectedCity = CITIES[data.targetCity] ?? CITIES.other;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
        <h2 className="text-[22px] font-semibold text-[#222222] mb-1" style={{ letterSpacing: "-0.44px" }}>
          Purpose &amp; Goals
        </h2>
        <p className="text-[#6a6a6a] text-sm mb-6">
          What are you looking to do? You can select multiple purposes (e.g. live in it first, rent it out later).
        </p>

        <div className="space-y-6">
          {/* Purpose — multi-select */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">
              What is the purpose of this property?
            </label>
            <p className="text-xs text-[#6a6a6a] mb-3">Select all that apply</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PURPOSE_OPTIONS.map((opt) => {
                const isSelected = data.purposes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ purposes: togglePurpose(data.purposes, opt.value) })}
                    className={`relative flex flex-col items-center gap-2 px-4 py-5 rounded-[20px] border-2 text-center transition-all ${
                      isSelected
                        ? "border-[#222222] bg-[#fafafa] shadow-sm"
                        : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#222222] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-sm font-semibold text-[#222222]">{opt.label}</span>
                    <span className="text-xs text-[#6a6a6a]">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
            {data.purposes.length > 1 && (
              <div className="mt-3 p-3 bg-[#f0f7ff] rounded-lg border border-[#d0e3ff]">
                <p className="text-sm text-[#2b5ea7]">
                  <strong>Mixed use:</strong> Tax rules will be based on the self-living component if selected. The analysis will consider all selected purposes.
                  {data.purposes.includes("self-living") && data.purposes.includes("buy-to-let") &&
                    " E.g. if you live in it first and rent later, transfer tax is 2% (or 0% with startersvrijstelling), not 10.4%."}
                </p>
              </div>
            )}
            {data.purposes.includes("buy-to-let") && !data.purposes.includes("self-living") && (
              <div className="mt-3 p-3 bg-[#fff0f0] rounded-lg border border-[#fdd]">
                <p className="text-sm text-[#c13515]">
                  Buy-to-let only: subject to 10.4% transfer tax and opkoopbescherming regulations in many cities.
                </p>
              </div>
            )}
          </div>

          {/* Target city */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">
              Target city / region
            </label>
            <select
              value={data.targetCity}
              onChange={(e) => onChange({ targetCity: e.target.value })}
              className="w-full max-w-[320px] px-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236a6a6a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              {CITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* City-specific market info */}
            {data.targetCity !== "other" && (
              <div className="mt-3 p-4 bg-[#f7f7f7] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[#222222]">
                    {selectedCity.name} Market Profile
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                    style={{ backgroundColor: TIGHTNESS_LABELS[selectedCity.marketTightness].color }}>
                    {TIGHTNESS_LABELS[selectedCity.marketTightness].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  <div>
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wide">Avg price/m²</p>
                    <p className="text-sm font-semibold text-[#222222]">€{selectedCity.averagePropertyPriceSqm.toLocaleString("nl-NL")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wide">Avg rent/m²</p>
                    <p className="text-sm font-semibold text-[#222222]">€{selectedCity.averageRentPerSqm}/mo</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wide">Overbidding</p>
                    <p className="text-sm font-semibold text-[#222222]">+{selectedCity.averageOverbiddingPercent}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wide">Price growth/yr</p>
                    <p className="text-sm font-semibold text-[#222222]">{(selectedCity.annualAppreciationRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <p className="text-xs text-[#6a6a6a] italic">{selectedCity.marketNote}</p>
                <p className="text-[10px] text-[#428bff] mt-1.5">
                  All calculations below are tailored to {selectedCity.name}&apos;s specific market data.
                </p>
              </div>
            )}
          </div>

          {/* Stay duration */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-2">
              How long do you plan to stay / hold?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ stayDuration: opt.value })}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-center transition-all ${
                    data.stayDuration === opt.value
                      ? "border-[#222222] bg-[#fafafa]"
                      : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {data.stayDuration === "<3y" && (
              <p className="text-xs text-[#e07912] mt-1.5">
                Short stays (&lt;3 years) rarely break even due to high transaction costs.
              </p>
            )}
          </div>

          {/* Risk tolerance */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-2">Risk tolerance</label>
            <div className="grid grid-cols-3 gap-3">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ riskTolerance: opt.value })}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-center transition-all ${
                    data.riskTolerance === opt.value
                      ? "border-[#222222] bg-[#fafafa]"
                      : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                  }`}
                >
                  <span className="text-sm font-semibold" style={{ color: opt.color }}>{opt.label}</span>
                  <span className="text-[11px] text-[#6a6a6a] hidden sm:block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8] transition-all active:scale-[0.96]"
        >
          &larr; Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg text-sm font-medium bg-[#222222] text-white hover:bg-[#ff385c] transition-all active:scale-[0.96]"
        >
          Next: Property &rarr;
        </button>
      </div>
    </div>
  );
}
