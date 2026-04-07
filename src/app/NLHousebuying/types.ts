// ── Enums & Literal Types ──────────────────────────────────

export type EmploymentType = "vast" | "tijdelijk" | "zzp" | "student";
export type Purpose = "self-living" | "investment" | "buy-to-let";
export type StayDuration = "<3y" | "3-5y" | "5-10y" | "10+y";
export type RiskTolerance = "low" | "medium" | "high";
export type PropertyType = "apartment" | "house" | "studio";
export type EnergyLabel = "A+++" | "A++" | "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type StudentDebtSystem = "old" | "new";
export type Recommendation = "BUY" | "RENT" | "WAIT";
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
export type RegulationYear = 2025 | 2026;
export type MarketTightness = "extremely_tight" | "tight" | "moderate" | "loose";

// ── Step 1: Personal Profile ───────────────────────────────

export interface PersonalProfile {
  age: number | null;
  hasPartner: boolean;
  employmentType: EmploymentType;
  partnerEmploymentType: EmploymentType | null;
  grossAnnualIncome: number;
  partnerGrossAnnualIncome: number;
  hasStudentDebt: boolean;
  studentDebtSystem: StudentDebtSystem;
  monthlyStudentDebtPayment: number;
  otherMonthlyDebts: number;
  currentSavings: number;
  isFirstTimeBuyer: boolean;
  has30PercentRuling: boolean;
  thirtyPercentRulingMonthsRemaining: number | null;
}

// ── Step 2: Purpose & Goals ────────────────────────────────

export interface PurposeGoals {
  purposes: Purpose[]; // multi-select
  targetCity: string;
  stayDuration: StayDuration;
  riskTolerance: RiskTolerance;
}

// ── Step 3: Property Details ───────────────────────────────

export interface PropertyDetails {
  propertyType: PropertyType;
  estimatedPrice: number;
  energyLabel: EnergyLabel;
  estimatedVvEMonthly: number;
  currentMonthlyRent: number | null; // null = estimate from city data
}

// ── Editable Overrides (consultant values) ─────────────────

export interface CalculationOverrides {
  maxMortgage: number | null;       // null = use calculated
  interestRate: number | null;      // null = use default 4%
  monthlyPayment: number | null;    // null = use calculated
  monthlyRent: number | null;       // null = use city-average estimate
}

// ── Full Wizard State ──────────────────────────────────────

export interface WizardState {
  currentStep: WizardStep;
  regulationYear: RegulationYear;
  personal: PersonalProfile;
  purpose: PurposeGoals;
  property: PropertyDetails;
  overrides: CalculationOverrides;
}

// ── Wizard Actions ─────────────────────────────────────────

export type WizardAction =
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "UPDATE_PERSONAL"; payload: Partial<PersonalProfile> }
  | { type: "UPDATE_PURPOSE"; payload: Partial<PurposeGoals> }
  | { type: "UPDATE_PROPERTY"; payload: Partial<PropertyDetails> }
  | { type: "UPDATE_OVERRIDES"; payload: Partial<CalculationOverrides> }
  | { type: "SET_YEAR"; year: RegulationYear }
  | { type: "RESET" };

// ── Calculation Results ────────────────────────────────────

export interface MortgageResult {
  maxMortgageSingle: number;
  maxMortgageWithPartner: number | null;
  effectiveMaxMortgage: number; // after overrides
  nhgEligible: boolean;
  nhgLimit: number;
  nhgPremium: number;
  estimatedMonthlyPaymentAnnuity: number;
  estimatedMonthlyPaymentLinear: number;
  monthlyTaxBenefit: number;
  netMonthlyPayment: number; // after tax deduction
  interestRate: number;
  ltv: number;
  canFinance: boolean;
  shortfall: number;
  isOverridden: boolean;
}

export interface TaxResult {
  transferTaxRate: number;
  transferTaxAmount: number;
  starterExemptionEligible: boolean;
  starterExemptionReason: string;
  hypotheekrenteaftrekRate: number;
  monthlyTaxBenefit: number;
  eigenwoningforfaitMonthly: number;
  netMonthlyTaxEffect: number;
}

export interface CostBreakdown {
  transferTax: number;
  notaryFees: number;
  appraisalFees: number;
  mortgageOriginationFees: number;
  nhgPremium: number;
  totalOneTime: number;
  mortgagePayment: number;
  maintenanceReserve: number; // houses only (0 for apartments, covered by VVE)
  vveCosts: number;
  ozbEstimate: number;
  waterschapsbelasting: number;
  rioolheffing: number;
  totalMonthlyGross: number;
  taxBenefit: number;
  totalMonthlyNet: number;
}

export interface RentVsBuyResult {
  estimatedMonthlyRent: number;
  monthlyCostBuying: number;
  breakEvenYears: number;
  npv10YearRent: number;
  npv10YearBuy: number;
  yearlyComparison: Array<{
    year: number;
    cumulativeRent: number;
    cumulativeBuy: number;
  }>;
  rateSensitivity: Array<{
    rate: number;
    breakEvenYears: number;
    monthlyCost: number;
  }>;
}

export interface RegulationCheckResult {
  opkoopbeschermingApplies: boolean;
  opkoopbeschermingWozCap: number | null;
  estimatedWwsPoints: number;
  wwsSector: "social" | "mid-rent" | "free";
  maxAllowedRent: number | null;
  rentIncreaseCapPercent: number;
  rentalPermitNeeded: boolean;
}

export interface RiskAssessment {
  overallScore: number;
  debtToIncomeRatio: number;
  employmentStabilityScore: number;
  financialHealthScore: number;
  marketRiskLevel: "low" | "medium" | "high";
  factors: Array<{
    label: string;
    status: "good" | "warning" | "danger";
    detail: string;
  }>;
}

export interface FinalRecommendation {
  verdict: Recommendation;
  confidence: number;
  reasoning: string[];
  actionItems: string[];
  resources: Array<{ label: string; url: string }>;
}

// ── City Data ──────────────────────────────────────────────

export interface CityData {
  name: string;
  nameDutch: string;
  opkoopbeschermingWozCap: number;
  averageRentPerSqm: number;
  averagePropertyPriceSqm: number;
  ozbRatePerMille: number;
  annualAppreciationRate: number;    // e.g. 0.06 = 6% per year
  averageOverbiddingPercent: number; // e.g. 8 = 8% above asking
  marketTightness: MarketTightness;
  marketNote: string;                // city-specific insight
}

// ── Regulation Constants ───────────────────────────────────

export interface YearRegulations {
  nhgLimit: number;
  startersvrijstellingCap: number;
  hypotheekrenteaftrekRate: number;
  eigenwoningforfaitRate: number;
  eigenwoningforfaitCap: number;
  transferTaxPrimary: number;
  transferTaxInvestment: number;
  nhgPremiumRate: number;
  starterAgeMin: number;
  starterAgeMax: number;
  rentIncreaseFree: number;
  rentIncreaseMid: number;
  wwsPointsSocialMax: number;
  wwsPointsMidRentMax: number;
  midRentRangeMin: number;
  midRentRangeMax: number;
}
