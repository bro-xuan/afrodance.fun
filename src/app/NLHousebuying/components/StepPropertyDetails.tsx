import type { PropertyDetails, PropertyType, EnergyLabel } from "../types";

interface Props {
  data: PropertyDetails;
  onChange: (payload: Partial<PropertyDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}

const PROPERTY_TYPES: { value: PropertyType; label: string; emoji: string }[] = [
  { value: "apartment", label: "Apartment", emoji: "🏢" },
  { value: "house", label: "House", emoji: "🏠" },
  { value: "studio", label: "Studio", emoji: "🏠" },
];

const ENERGY_LABELS: EnergyLabel[] = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"];

function formatEuro(value: number): string {
  if (!value) return "";
  return value.toLocaleString("nl-NL");
}

function parseEuro(str: string): number {
  const cleaned = str.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

export function StepPropertyDetails({ data, onChange, onBack, onNext }: Props) {
  const canProceed = data.estimatedPrice >= 50_000;
  const showVvE = data.propertyType !== "house";

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
        <h2 className="text-[22px] font-semibold text-[#222222] mb-1" style={{ letterSpacing: "-0.44px" }}>
          Property Details
        </h2>
        <p className="text-[#6a6a6a] text-sm mb-6">
          Tell us about the property you&apos;re considering.
        </p>

        <div className="space-y-6">
          {/* Property type */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-3">
              Property type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PROPERTY_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ propertyType: opt.value })}
                  className={`flex flex-col items-center gap-2 px-4 py-5 rounded-[20px] border-2 text-center transition-all ${
                    data.propertyType === opt.value
                      ? "border-[#222222] bg-[#fafafa] shadow-sm"
                      : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                  }`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-[#222222]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated price */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">
              Estimated purchase price
            </label>
            <div className="relative max-w-[320px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
              <input
                type="text"
                value={formatEuro(data.estimatedPrice)}
                onChange={(e) => onChange({ estimatedPrice: parseEuro(e.target.value) })}
                placeholder="e.g. 350,000"
                className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
              />
            </div>
            {data.estimatedPrice > 0 && data.estimatedPrice < 50_000 && (
              <p className="text-xs text-[#c13515] mt-1">
                Minimum property price for analysis is €50,000
              </p>
            )}
          </div>

          {/* Energy label */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">
              Energy label
            </label>
            <select
              value={data.energyLabel}
              onChange={(e) => onChange({ energyLabel: e.target.value as EnergyLabel })}
              className="w-full max-w-[200px] px-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236a6a6a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              {ENERGY_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#6a6a6a] mt-1">
              Affects WWS points calculation and energy-efficiency bonuses
            </p>
          </div>

          {/* Current monthly rent */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">
              Your current monthly rent (optional)
            </label>
            <div className="relative max-w-[200px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
              <input
                type="text"
                value={data.currentMonthlyRent !== null ? formatEuro(data.currentMonthlyRent) : ""}
                onChange={(e) => {
                  const val = parseEuro(e.target.value);
                  onChange({ currentMonthlyRent: val > 0 ? val : null });
                }}
                placeholder="e.g. 1,200"
                className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
              />
            </div>
            <p className="text-xs text-[#6a6a6a] mt-1">
              If left empty, we&apos;ll estimate based on average rent in your selected city.
            </p>
          </div>

          {/* VvE costs */}
          {showVvE && (
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1.5">
                Estimated monthly VvE costs
              </label>
              <div className="relative max-w-[200px]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
                <input
                  type="text"
                  value={formatEuro(data.estimatedVvEMonthly)}
                  onChange={(e) => onChange({ estimatedVvEMonthly: parseEuro(e.target.value) })}
                  placeholder="e.g. 150"
                  className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
                />
              </div>
              <p className="text-xs text-[#6a6a6a] mt-1">
                Homeowners association fee (Vereniging van Eigenaren). Typical range: €100-400/month.
              </p>
            </div>
          )}
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
          disabled={!canProceed}
          className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
            canProceed
              ? "bg-[#ff385c] text-white hover:bg-[#e00b41] active:scale-[0.96]"
              : "bg-[#e8e8e8] text-[#c1c1c1] cursor-not-allowed"
          }`}
        >
          Analyze My Situation &rarr;
        </button>
      </div>
    </div>
  );
}
