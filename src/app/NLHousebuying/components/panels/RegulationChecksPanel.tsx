import type { RegulationCheckResult, Purpose } from "../../types";

interface Props {
  result: RegulationCheckResult;
  purposes: Purpose[];
  cityName: string;
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

export function RegulationChecksPanel({ result, purposes, cityName }: Props) {
  const isBuyToLet = purposes.includes("buy-to-let");

  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <h3 className="text-lg font-semibold text-[#222222] mb-4" style={{ letterSpacing: "-0.18px" }}>
        Regulation Checks
      </h3>

      <div className="space-y-4">
        {/* Opkoopbescherming */}
        <div className={`p-4 rounded-xl border ${
          result.opkoopbeschermingApplies
            ? "bg-[#fff0f0] border-[#fdd]"
            : "bg-[#f7f7f7] border-transparent"
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">
              {result.opkoopbeschermingApplies ? "🔒" : "✅"}
            </span>
            <div>
              <p className="text-sm font-semibold text-[#222222]">
                Opkoopbescherming (Purchase Protection)
              </p>
              {result.opkoopbeschermingWozCap ? (
                <p className="text-xs text-[#6a6a6a] mt-1">
                  {result.opkoopbeschermingApplies
                    ? `Applies in ${cityName} — WOZ cap: ${eur(result.opkoopbeschermingWozCap)}. A rental permit is required.`
                    : `Active in ${cityName} (WOZ cap: ${eur(result.opkoopbeschermingWozCap)}), but your property price exceeds the cap.`}
                </p>
              ) : (
                <p className="text-xs text-[#6a6a6a] mt-1">
                  No opkoopbescherming data available for {cityName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* WWS Points */}
        <div className="p-4 rounded-xl bg-[#f7f7f7]">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">📊</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#222222]">
                WWS Points (Woningwaarderingsstelsel)
              </p>
              <p className="text-xs text-[#6a6a6a] mt-1">
                Estimated score: <strong>{result.estimatedWwsPoints} points</strong>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
                  result.wwsSector === "social"
                    ? "bg-[#428bff]"
                    : result.wwsSector === "mid-rent"
                      ? "bg-[#e07912]"
                      : "bg-[#008a05]"
                }`}>
                  {result.wwsSector === "social"
                    ? "Social Housing (≤143 pts)"
                    : result.wwsSector === "mid-rent"
                      ? "Mid-Rent Sector (144-186 pts)"
                      : "Free Sector (≥187 pts)"}
                </span>
              </div>
              {result.maxAllowedRent !== null && isBuyToLet && (
                <p className="text-xs text-[#6a6a6a] mt-2">
                  Maximum allowed rent: {eur(result.maxAllowedRent)}/month
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rent increase cap */}
        <div className="p-4 rounded-xl bg-[#f7f7f7]">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">📈</span>
            <div>
              <p className="text-sm font-semibold text-[#222222]">
                Annual Rent Increase Cap
              </p>
              <p className="text-xs text-[#6a6a6a] mt-1">
                {result.rentIncreaseCapPercent.toFixed(1)}% maximum annual increase for{" "}
                {result.wwsSector === "free" ? "free sector" : "regulated sector"} properties
              </p>
            </div>
          </div>
        </div>

        {/* Rental permit */}
        {isBuyToLet && (
          <div className={`p-4 rounded-xl border ${
            result.rentalPermitNeeded
              ? "bg-[#fff8f0] border-[#fde2c8]"
              : "bg-[#f7f7f7] border-transparent"
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">📋</span>
              <div>
                <p className="text-sm font-semibold text-[#222222]">
                  Rental Permit (Verhuurvergunning)
                </p>
                <p className="text-xs text-[#6a6a6a] mt-1">
                  {result.rentalPermitNeeded
                    ? `Required in ${cityName} under opkoopbescherming. Apply at the municipality before renting out.`
                    : `Not required based on current data for ${cityName}.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
