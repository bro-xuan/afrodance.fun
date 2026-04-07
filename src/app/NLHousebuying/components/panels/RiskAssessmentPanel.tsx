import type { RiskAssessment } from "../../types";

interface Props {
  risk: RiskAssessment;
}

const statusColors = {
  good: { bg: "bg-[#f0faf0]", text: "text-[#008a05]", dot: "bg-[#008a05]" },
  warning: { bg: "bg-[#fff8f0]", text: "text-[#e07912]", dot: "bg-[#e07912]" },
  danger: { bg: "bg-[#fff0f0]", text: "text-[#c13515]", dot: "bg-[#c13515]" },
};

export function RiskAssessmentPanel({ risk }: Props) {
  const scoreColor =
    risk.overallScore >= 70
      ? "#008a05"
      : risk.overallScore >= 45
        ? "#e07912"
        : "#c13515";

  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <h3 className="text-lg font-semibold text-[#222222] mb-4" style={{ letterSpacing: "-0.18px" }}>
        Risk Assessment
      </h3>

      {/* Overall score */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#f2f2f2"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={`${risk.overallScore * 2.64} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: scoreColor }}>
              {risk.overallScore}
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#222222]">
            Overall Risk Score
          </p>
          <p className="text-xs text-[#6a6a6a] mt-0.5">
            {risk.overallScore >= 70
              ? "Low risk — favorable conditions for buying"
              : risk.overallScore >= 45
                ? "Moderate risk — some factors need attention"
                : "High risk — consider waiting or renting"}
          </p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-lg font-bold text-[#222222]">{risk.debtToIncomeRatio}%</p>
          <p className="text-[10px] text-[#6a6a6a]">Debt-to-Income</p>
        </div>
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-lg font-bold text-[#222222]">{risk.employmentStabilityScore}</p>
          <p className="text-[10px] text-[#6a6a6a]">Employment Score</p>
        </div>
        <div className="text-center p-3 bg-[#f7f7f7] rounded-xl">
          <p className="text-lg font-bold text-[#222222]">{risk.financialHealthScore}</p>
          <p className="text-[10px] text-[#6a6a6a]">Financial Health</p>
        </div>
      </div>

      {/* Risk factors */}
      <div className="space-y-2">
        {risk.factors.map((factor, i) => {
          const colors = statusColors[factor.status];
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
              <div>
                <p className={`text-sm font-medium ${colors.text}`}>
                  {factor.label}
                </p>
                <p className="text-xs text-[#6a6a6a] mt-0.5">{factor.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
