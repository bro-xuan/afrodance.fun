import type { PersonalProfile, PurposeGoals, TaxResult, RegulationYear } from "../types";
import { REGULATIONS, MORTGAGE_RULES } from "../data/regulations";

export function calculateTaxes(
  personal: PersonalProfile,
  purpose: PurposeGoals,
  propertyPrice: number,
  year: RegulationYear
): TaxResult {
  const regs = REGULATIONS[year];
  const rate = MORTGAGE_RULES.defaultInterestRate;
  const isSelfLiving = purpose.purposes.includes("self-living");

  // Transfer tax — based on primary purpose
  const { taxRate, eligible, reason } = getTransferTaxDetails(
    personal,
    purpose,
    propertyPrice,
    regs
  );
  const transferTaxAmount = propertyPrice * taxRate;

  // Hypotheekrenteaftrek (only for self-living primary residence)
  // Formula: net deductible = interest paid - eigenwoningforfait (both income amounts)
  //          tax benefit = net deductible × tax rate
  let monthlyTaxBenefit = 0;
  let eigenwoningforfaitMonthly = 0;
  let netMonthlyTaxEffect = 0;

  if (isSelfLiving) {
    const principal = Math.min(
      propertyPrice,
      personal.grossAnnualIncome * MORTGAGE_RULES.maxIncomeMultiplier +
        (personal.hasPartner ? 0 : MORTGAGE_RULES.singleSupplement)
    );
    const annualInterest = principal * rate;

    // Eigenwoningforfait: imputed income based on WOZ value (using property price as proxy)
    const forfaitRate =
      propertyPrice <= regs.eigenwoningforfaitCap
        ? regs.eigenwoningforfaitRate
        : 0.0235;
    const annualForfait = propertyPrice * forfaitRate;
    eigenwoningforfaitMonthly = annualForfait / 12;

    // Net deductible income, then apply tax rate
    const netDeductible = Math.max(0, annualInterest - annualForfait);
    netMonthlyTaxEffect = (netDeductible * regs.hypotheekrenteaftrekRate) / 12;
    monthlyTaxBenefit = (annualInterest * regs.hypotheekrenteaftrekRate) / 12;
  }

  return {
    transferTaxRate: taxRate,
    transferTaxAmount,
    starterExemptionEligible: eligible,
    starterExemptionReason: reason,
    hypotheekrenteaftrekRate: regs.hypotheekrenteaftrekRate,
    monthlyTaxBenefit,
    eigenwoningforfaitMonthly,
    netMonthlyTaxEffect,
  };
}

function getTransferTaxDetails(
  personal: PersonalProfile,
  purpose: PurposeGoals,
  propertyPrice: number,
  regs: typeof REGULATIONS[2025]
): { taxRate: number; eligible: boolean; reason: string } {
  const isSelfLiving = purpose.purposes.includes("self-living");

  // If self-living is NOT among purposes → investment rate
  if (!isSelfLiving) {
    return {
      taxRate: regs.transferTaxInvestment,
      eligible: false,
      reason: "Investment/buy-to-let properties are taxed at 10.4% (no self-living selected).",
    };
  }

  // Check starter exemption: requires ALL three conditions
  const age = personal.age ?? 0;
  const isAgeEligible = age >= regs.starterAgeMin && age <= regs.starterAgeMax;
  const isPriceEligible = propertyPrice <= regs.startersvrijstellingCap;

  if (personal.isFirstTimeBuyer && isAgeEligible && isPriceEligible) {
    return {
      taxRate: 0,
      eligible: true,
      reason: `Startersvrijstelling: 0% transfer tax. You meet all 3 requirements: ` +
        `(1) first-time buyer, (2) age ${age} is between 18-35, ` +
        `(3) property price €${propertyPrice.toLocaleString("nl-NL")} is under the €${(regs.startersvrijstellingCap / 1000).toFixed(0)}k cap.`,
    };
  }

  // Not eligible — build detailed explanation
  const failed: string[] = [];
  if (!personal.isFirstTimeBuyer) {
    failed.push("you are not a first-time buyer");
  }
  if (!isAgeEligible) {
    failed.push(`your age (${age}) is outside the 18-35 range`);
  }
  if (!isPriceEligible) {
    failed.push(`the property price (€${propertyPrice.toLocaleString("nl-NL")}) exceeds the €${(regs.startersvrijstellingCap / 1000).toFixed(0)}k cap`);
  }

  const reason = `Standard 2% transfer tax. Startersvrijstelling (0%) not available because: ${failed.join("; ")}. ` +
    `Requirements: (1) first-time buyer, (2) age 18-35, (3) property ≤ €${(regs.startersvrijstellingCap / 1000).toFixed(0)}k.`;

  return {
    taxRate: regs.transferTaxPrimary,
    eligible: false,
    reason,
  };
}
