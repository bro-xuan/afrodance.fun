import type { FinalRecommendation } from "../../types";

interface Props {
  recommendation: FinalRecommendation;
}

const verdictStyles = {
  BUY: {
    border: "border-l-[#008a05]",
    bg: "bg-[#f0faf0]",
    text: "text-[#008a05]",
    emoji: "🏠",
    title: "Buy",
    subtitle: "The numbers support buying",
  },
  RENT: {
    border: "border-l-[#ff385c]",
    bg: "bg-[#fff0f0]",
    text: "text-[#ff385c]",
    emoji: "🔑",
    title: "Rent",
    subtitle: "Renting makes more sense right now",
  },
  WAIT: {
    border: "border-l-[#e07912]",
    bg: "bg-[#fff8f0]",
    text: "text-[#e07912]",
    emoji: "⏳",
    title: "Wait",
    subtitle: "Conditions aren't ideal yet",
  },
};

export function RecommendationPanel({ recommendation }: Props) {
  const style = verdictStyles[recommendation.verdict];

  return (
    <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
      <h3 className="text-lg font-semibold text-[#222222] mb-4" style={{ letterSpacing: "-0.18px" }}>
        Recommendation
      </h3>

      {/* Verdict card */}
      <div className={`${style.bg} border-l-4 ${style.border} rounded-r-xl p-6 mb-6`}>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-4xl">{style.emoji}</span>
          <div>
            <p className={`text-2xl font-bold ${style.text}`}>
              {style.title}
            </p>
            <p className="text-sm text-[#6a6a6a]">{style.subtitle}</p>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#6a6a6a]">Confidence</span>
            <span className="text-xs font-medium text-[#222222]">
              {recommendation.confidence}%
            </span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                recommendation.verdict === "BUY"
                  ? "bg-[#008a05]"
                  : recommendation.verdict === "RENT"
                    ? "bg-[#ff385c]"
                    : "bg-[#e07912]"
              }`}
              style={{ width: `${recommendation.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-[#222222] mb-2">
          Key Factors
        </h4>
        <ul className="space-y-2">
          {recommendation.reasoning.map((reason, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#6a6a6a] mt-0.5 shrink-0">•</span>
              <span className="text-sm text-[#6a6a6a]">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action items */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-[#222222] mb-2">
          Next Steps
        </h4>
        <div className="space-y-2">
          {recommendation.actionItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-[#f7f7f7] rounded-lg">
              <span className="text-xs font-bold text-[#ff385c] mt-0.5 shrink-0 w-5">
                {i + 1}.
              </span>
              <span className="text-sm text-[#222222]">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div>
        <h4 className="text-sm font-semibold text-[#222222] mb-2">
          Official Resources
        </h4>
        <div className="flex flex-wrap gap-2">
          {recommendation.resources.map((res, i) => (
            <a
              key={i}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f7f7f7] rounded-lg text-xs font-medium text-[#428bff] hover:bg-[#eef5ff] transition-colors"
            >
              {res.label}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
