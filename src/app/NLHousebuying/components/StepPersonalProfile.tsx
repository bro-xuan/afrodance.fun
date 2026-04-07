import type { PersonalProfile, EmploymentType, StudentDebtSystem } from "../types";

interface Props {
  data: PersonalProfile;
  onChange: (payload: Partial<PersonalProfile>) => void;
  onNext: () => void;
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; emoji: string }[] = [
  { value: "vast", label: "Permanent (vast)", emoji: "✅" },
  { value: "tijdelijk", label: "Temporary (tijdelijk)", emoji: "📋" },
  { value: "zzp", label: "Self-employed (ZZP)", emoji: "💼" },
  { value: "student", label: "Student", emoji: "🎓" },
];

function formatEuro(value: number): string {
  if (!value) return "";
  return value.toLocaleString("nl-NL");
}

function parseEuro(str: string): number {
  const cleaned = str.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

// Custom toggle component (replaces native checkbox)
function Toggle({ checked, onChange, label, sublabel }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left"
    >
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${
        checked ? "bg-[#222222]" : "bg-[#c1c1c1]"
      }`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </div>
      <div>
        <span className="text-sm font-medium text-[#222222]">{label}</span>
        {sublabel && <p className="text-xs text-[#6a6a6a] mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

export function StepPersonalProfile({ data, onChange, onNext }: Props) {
  const canProceed =
    data.age !== null &&
    data.age >= 18 &&
    (data.employmentType === "student" || data.grossAnnualIncome > 0);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[20px] p-6 sm:p-8" style={{ boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
        <h2 className="text-[22px] font-semibold text-[#222222] mb-1" style={{ letterSpacing: "-0.44px" }}>
          Your Personal Profile
        </h2>
        <p className="text-[#6a6a6a] text-sm mb-6">
          Tell us about your situation so we can calculate what you can afford.
        </p>

        <div className="space-y-6">
          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">Age</label>
            <input
              type="number"
              min={18}
              max={99}
              value={data.age ?? ""}
              onChange={(e) => onChange({ age: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 28"
              className="w-full max-w-[200px] px-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
            />
            {data.age !== null && data.age >= 18 && data.age <= 35 && (
              <p className="text-xs text-[#008a05] mt-1">
                Age eligible for startersvrijstelling (0% transfer tax if first-time buyer and property under cap)
              </p>
            )}
          </div>

          {/* Employment type */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-2">Employment type</label>
            <div className="grid grid-cols-2 gap-3">
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ employmentType: opt.value })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                    data.employmentType === opt.value
                      ? "border-[#222222] bg-[#fafafa]"
                      : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-[#222222]">{opt.label}</span>
                </button>
              ))}
            </div>
            {data.employmentType === "student" && (
              <div className="mt-3 p-3 bg-[#fff8f0] rounded-lg border border-[#fde2c8]">
                <p className="text-sm text-[#9c5700]">
                  Students generally cannot qualify for a mortgage. We&apos;ll show you a rent-focused analysis.
                </p>
              </div>
            )}
          </div>

          {/* Gross annual income */}
          {data.employmentType !== "student" && (
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1.5">
                Gross annual income (bruto jaarsalaris)
              </label>
              <div className="relative max-w-[280px]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
                <input
                  type="text"
                  value={formatEuro(data.grossAnnualIncome)}
                  onChange={(e) => onChange({ grossAnnualIncome: parseEuro(e.target.value) })}
                  placeholder="e.g. 55,000"
                  className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
                />
              </div>
              {data.employmentType === "zzp" && (
                <p className="text-xs text-[#6a6a6a] mt-1">Average of your last 3 years of tax returns</p>
              )}
            </div>
          )}

          {/* 30% ruling */}
          {data.employmentType !== "student" && (
            <div className="space-y-2">
              <Toggle
                checked={data.has30PercentRuling}
                onChange={(v) => onChange({ has30PercentRuling: v })}
                label="I have the 30% ruling (30%-regeling)"
                sublabel="Tax benefit for expats/highly skilled migrants. 30% of gross salary is tax-free."
              />
              {data.has30PercentRuling && (
                <div className="pl-4 border-l-2 border-[#f2f2f2] space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#222222] mb-1.5">
                      Months remaining on 30% ruling
                    </label>
                    <div className="max-w-[200px]">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={data.thirtyPercentRulingMonthsRemaining ?? ""}
                        onChange={(e) => onChange({
                          thirtyPercentRulingMonthsRemaining: e.target.value ? parseInt(e.target.value) : null,
                        })}
                        placeholder="e.g. 36"
                        className="w-full px-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
                      />
                    </div>
                    <p className="text-xs text-[#6a6a6a] mt-1">Max 60 months (5 years) at the full 30% rate.</p>
                  </div>
                  {data.thirtyPercentRulingMonthsRemaining !== null && data.thirtyPercentRulingMonthsRemaining <= 24 && (
                    <div className="p-3 bg-[#fff8f0] rounded-lg border border-[#fde2c8]">
                      <p className="text-xs text-[#9c5700]">
                        <strong>Warning:</strong> Your 30% ruling ends in {data.thirtyPercentRulingMonthsRemaining} months. After it expires, your net income will drop significantly. Make sure your mortgage remains affordable on your regular (non-ruling) salary.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-[#f0f7ff] rounded-lg border border-[#d0e3ff]">
                    <p className="text-xs text-[#2b5ea7]">
                      <strong>How it affects your mortgage:</strong> Most lenders use your full gross salary for mortgage calculation. However, your taxable income is only 70% of gross — this means higher net disposable income, making monthly payments more affordable. The hypotheekrenteaftrek is calculated on the 70% taxable portion.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Partner */}
          <Toggle
            checked={data.hasPartner}
            onChange={(v) => onChange({
              hasPartner: v,
              partnerEmploymentType: v ? "vast" : null,
              partnerGrossAnnualIncome: v ? data.partnerGrossAnnualIncome : 0,
            })}
            label="I have a partner (combined income)"
          />

          {data.hasPartner && (
            <div className="pl-4 border-l-2 border-[#f2f2f2] space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">
                  Partner&apos;s employment type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EMPLOYMENT_OPTIONS.filter(o => o.value !== "student").map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ partnerEmploymentType: opt.value })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all ${
                        data.partnerEmploymentType === opt.value
                          ? "border-[#222222] bg-[#fafafa]"
                          : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span className="text-[#222222]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-1.5">
                  Partner&apos;s gross annual income
                </label>
                <div className="relative max-w-[280px]">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
                  <input
                    type="text"
                    value={formatEuro(data.partnerGrossAnnualIncome)}
                    onChange={(e) => onChange({ partnerGrossAnnualIncome: parseEuro(e.target.value) })}
                    placeholder="e.g. 45,000"
                    className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Student debt */}
          <Toggle
            checked={data.hasStudentDebt}
            onChange={(v) => onChange({ hasStudentDebt: v })}
            label="I have student debt (studieschuld)"
          />

          {data.hasStudentDebt && (
            <div className="pl-4 border-l-2 border-[#f2f2f2] space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">Loan system</label>
                <div className="flex gap-3">
                  {(["old", "new"] as StudentDebtSystem[]).map((sys) => (
                    <button
                      key={sys}
                      onClick={() => onChange({ studentDebtSystem: sys })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        data.studentDebtSystem === sys
                          ? "border-[#222222] bg-[#fafafa]"
                          : "border-[#e8e8e8] hover:border-[#c1c1c1]"
                      }`}
                    >
                      {sys === "old" ? "Old system (pre-2015)" : "New system (2015+)"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#6a6a6a] mt-1">
                  {data.studentDebtSystem === "old"
                    ? "Weighting factor: 0.65% — higher impact on mortgage"
                    : "Weighting factor: 0.35% — lower impact on mortgage"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-1.5">Monthly DUO payment</label>
                <div className="relative max-w-[200px]">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
                  <input
                    type="text"
                    value={formatEuro(data.monthlyStudentDebtPayment)}
                    onChange={(e) => onChange({ monthlyStudentDebtPayment: parseEuro(e.target.value) })}
                    placeholder="e.g. 150"
                    className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Other debts */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">Other monthly debt obligations</label>
            <div className="relative max-w-[200px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
              <input
                type="text"
                value={formatEuro(data.otherMonthlyDebts)}
                onChange={(e) => onChange({ otherMonthlyDebts: parseEuro(e.target.value) })}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
              />
            </div>
            <p className="text-xs text-[#6a6a6a] mt-1">Car loans, personal loans, credit card minimum payments, etc.</p>
          </div>

          {/* Savings */}
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1.5">Current savings</label>
            <div className="relative max-w-[280px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a] text-sm">€</span>
              <input
                type="text"
                value={formatEuro(data.currentSavings)}
                onChange={(e) => onChange({ currentSavings: parseEuro(e.target.value) })}
                placeholder="e.g. 30,000"
                className="w-full pl-8 pr-4 py-2.5 border border-[#c1c1c1] rounded-lg text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          {/* First-time buyer */}
          <Toggle
            checked={data.isFirstTimeBuyer}
            onChange={(v) => onChange({ isFirstTimeBuyer: v })}
            label="First-time home buyer"
            sublabel="First-time buyers aged 18-35 may qualify for 0% transfer tax (startersvrijstelling) if the property is under the price cap."
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
            canProceed
              ? "bg-[#222222] text-white hover:bg-[#ff385c] active:scale-[0.96]"
              : "bg-[#e8e8e8] text-[#c1c1c1] cursor-not-allowed"
          }`}
        >
          Next: Goals &rarr;
        </button>
      </div>
    </div>
  );
}
