import type { PersonalProfile, MortgageResult, CalculationOverrides, RegulationYear, Purpose } from "../types";
import { REGULATIONS, MORTGAGE_RULES, EMPLOYMENT_FACTORS } from "../data/regulations";

export function calculateMortgage(
  personal: PersonalProfile,
  propertyPrice: number,
  year: RegulationYear,
  purposes: Purpose[],
  overrides: CalculationOverrides
): MortgageResult {
  const regs = REGULATIONS[year];
  const rules = MORTGAGE_RULES;
  const rate = overrides.interestRate ?? rules.defaultInterestRate;
  const isSelfLiving = purposes.includes("self-living");

  // Base mortgage calculation
  const primaryIncome = personal.grossAnnualIncome * EMPLOYMENT_FACTORS[personal.employmentType].incomeWeight;
  let baseSingle = primaryIncome * rules.maxIncomeMultiplier;
  if (!personal.hasPartner) {
    baseSingle += rules.singleSupplement;
  }

  // Partner calculation
  let baseWithPartner: number | null = null;
  if (personal.hasPartner && personal.partnerGrossAnnualIncome > 0) {
    const partnerWeight = personal.partnerEmploymentType
      ? EMPLOYMENT_FACTORS[personal.partnerEmploymentType].incomeWeight
      : 1.0;
    const combinedIncome =
      primaryIncome + personal.partnerGrossAnnualIncome * partnerWeight;
    baseWithPartner = combinedIncome * rules.maxIncomeMultiplier;
  }

  // Student debt reduction
  let studentDebtReduction = 0;
  if (personal.hasStudentDebt && personal.monthlyStudentDebtPayment > 0) {
    const weight =
      personal.studentDebtSystem === "old"
        ? rules.studentDebtWeightOld
        : rules.studentDebtWeightNew;
    studentDebtReduction = personal.monthlyStudentDebtPayment / weight;
  }

  // Other debt reduction
  const otherDebtReduction = personal.otherMonthlyDebts * 12 * 5;

  const totalReduction = studentDebtReduction + otherDebtReduction;
  const maxMortgageSingle = Math.max(0, baseSingle - totalReduction);
  const maxMortgageWithPartner =
    baseWithPartner !== null
      ? Math.max(0, baseWithPartner - totalReduction)
      : null;

  // Use override or calculated max
  const calculatedMax = maxMortgageWithPartner ?? maxMortgageSingle;
  const effectiveMaxMortgage = overrides.maxMortgage ?? calculatedMax;
  const isOverridden = overrides.maxMortgage !== null;

  // NHG eligibility
  const nhgEligible = propertyPrice <= regs.nhgLimit && propertyPrice > 0;
  const nhgPremium = nhgEligible ? propertyPrice * regs.nhgPremiumRate : 0;

  // LTV
  const ltv = propertyPrice > 0 ? (effectiveMaxMortgage / propertyPrice) * 100 : 0;

  // Can finance?
  const canFinance = effectiveMaxMortgage >= propertyPrice && propertyPrice > 0;
  const shortfall = canFinance ? 0 : propertyPrice - effectiveMaxMortgage;

  // Monthly payment calculations
  const principal = Math.min(effectiveMaxMortgage, propertyPrice);
  const monthlyAnnuity = overrides.monthlyPayment ?? calculateAnnuityPayment(principal, rate, rules.defaultTermYears);
  const monthlyLinear = calculateLinearPaymentInitial(principal, rate, rules.defaultTermYears);

  // Tax benefit (hypotheekrenteaftrek) — only for self-living
  let monthlyTaxBenefit = 0;
  if (isSelfLiving) {
    const annualInterest = principal * rate;
    monthlyTaxBenefit = (annualInterest * regs.hypotheekrenteaftrekRate) / 12;
  }
  const netMonthlyPayment = monthlyAnnuity - monthlyTaxBenefit;

  return {
    maxMortgageSingle,
    maxMortgageWithPartner,
    effectiveMaxMortgage,
    nhgEligible,
    nhgLimit: regs.nhgLimit,
    nhgPremium,
    estimatedMonthlyPaymentAnnuity: monthlyAnnuity,
    estimatedMonthlyPaymentLinear: monthlyLinear,
    monthlyTaxBenefit,
    netMonthlyPayment,
    interestRate: rate,
    ltv,
    canFinance,
    shortfall,
    isOverridden,
  };
}

export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calculateLinearPaymentInitial(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  const monthlyPrincipal = principal / n;
  const monthlyInterest = principal * (annualRate / 12);
  return monthlyPrincipal + monthlyInterest;
}

export function calculatePrincipalPaidInYear(
  principal: number,
  annualRate: number,
  termYears: number,
  year: number
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  const monthlyPayment =
    principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  let remaining = principal;
  let principalPaid = 0;

  for (let m = 1; m <= year * 12; m++) {
    const interest = remaining * r;
    const princ = monthlyPayment - interest;
    if (m > (year - 1) * 12) {
      principalPaid += princ;
    }
    remaining -= princ;
  }

  return principalPaid;
}
