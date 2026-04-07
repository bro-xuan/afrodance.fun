import type { YearRegulations, EmploymentType, RegulationYear } from "../types";

export const REGULATIONS: Record<RegulationYear, YearRegulations> = {
  2025: {
    nhgLimit: 450_000,
    startersvrijstellingCap: 525_000,
    hypotheekrenteaftrekRate: 0.3697,
    eigenwoningforfaitRate: 0.0035,
    eigenwoningforfaitCap: 1_330_000,
    transferTaxPrimary: 0.02,
    transferTaxInvestment: 0.104,
    nhgPremiumRate: 0.004,
    starterAgeMin: 18,
    starterAgeMax: 35,
    rentIncreaseFree: 0.041,
    rentIncreaseMid: 0.077,
    wwsPointsSocialMax: 143,
    wwsPointsMidRentMax: 186,
    midRentRangeMin: 900,
    midRentRangeMax: 1185,
  },
  2026: {
    nhgLimit: 470_000,
    startersvrijstellingCap: 555_000,
    hypotheekrenteaftrekRate: 0.3756,
    eigenwoningforfaitRate: 0.0035,
    eigenwoningforfaitCap: 1_350_000,
    transferTaxPrimary: 0.02,
    transferTaxInvestment: 0.104,
    nhgPremiumRate: 0.004,
    starterAgeMin: 18,
    starterAgeMax: 35,
    rentIncreaseFree: 0.041,
    rentIncreaseMid: 0.077,
    wwsPointsSocialMax: 143,
    wwsPointsMidRentMax: 186,
    midRentRangeMin: 900,
    midRentRangeMax: 1185,
  },
};

export const MORTGAGE_RULES = {
  maxIncomeMultiplier: 4.25,
  singleSupplement: 17_000,
  maxLTV: 1.0,
  interestRateLow: 0.035,
  interestRateHigh: 0.045,
  defaultInterestRate: 0.04,
  defaultTermYears: 30,
  studentDebtWeightOld: 0.0065,
  studentDebtWeightNew: 0.0035,
} as const;

export const COST_ESTIMATES = {
  notaryFees: 2_250,
  appraisalFees: 1_000,
  mortgageOriginationFees: 1_150,
  // Nibud guideline: 1% of property value/yr for standalone houses (not apartments — covered by VVE)
  maintenancePercentHouse: 0.01,
  // Municipal taxes (annual averages based on 2026 data)
  waterschapsbelastingAnnual: 250,
  rioolheffingAnnual: 150,
} as const;

export const THIRTY_PERCENT_RULING = {
  taxFreePercentage: 0.30,
  maxDuration: 60,          // months
  minSalary2025: 46_660,
  minSalaryUnder30Masters: 35_468,
  maxSalaryCap2025: 246_000,
  maxSalaryCap2026: 262_000,
  // 30% for full 5-year duration (no step-down as of 2026)
  note: "30% of gross salary is tax-free for qualifying expats/highly skilled migrants. Max 5 years. Most lenders use the full gross salary for mortgage calculation, but taxable income is only 70%.",
} as const;

export const EMPLOYMENT_FACTORS: Record<
  EmploymentType,
  { incomeWeight: number; canQualify: boolean; stabilityScore: number; note: string }
> = {
  vast: {
    incomeWeight: 1.0,
    canQualify: true,
    stabilityScore: 95,
    note: "Permanent contract — full income counts, preferred by lenders",
  },
  tijdelijk: {
    incomeWeight: 1.0,
    canQualify: true,
    stabilityScore: 65,
    note: "Temporary contract — accepted if >2 years remaining",
  },
  zzp: {
    incomeWeight: 1.0,
    canQualify: true,
    stabilityScore: 55,
    note: "Self-employed — requires 3 years of tax returns, average income used",
  },
  student: {
    incomeWeight: 0,
    canQualify: false,
    stabilityScore: 10,
    note: "Student — generally cannot qualify for a mortgage",
  },
};
