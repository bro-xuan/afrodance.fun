import type {
  PersonalProfile,
  PurposeGoals,
  PropertyDetails,
  CostBreakdown,
  MortgageResult,
  TaxResult,
  RegulationYear,
} from "../types";
import { COST_ESTIMATES } from "../data/regulations";
import { CITIES } from "../data/cities";

export function calculateCosts(
  personal: PersonalProfile,
  purpose: PurposeGoals,
  property: PropertyDetails,
  mortgage: MortgageResult,
  taxes: TaxResult,
  year: RegulationYear
): CostBreakdown {
  void year; // available for future year-specific cost adjustments

  const city = CITIES[purpose.targetCity] ?? CITIES.other;

  // One-time costs
  const transferTax = taxes.transferTaxAmount;
  const notaryFees = COST_ESTIMATES.notaryFees;
  const appraisalFees = COST_ESTIMATES.appraisalFees;
  const mortgageOriginationFees = COST_ESTIMATES.mortgageOriginationFees;
  const nhgPremium = mortgage.nhgPremium;
  const totalOneTime =
    transferTax + notaryFees + appraisalFees + mortgageOriginationFees + nhgPremium;

  // Monthly recurring costs
  const mortgagePayment = mortgage.estimatedMonthlyPaymentAnnuity;

  // Maintenance reserve: only for houses (apartments have this in VVE)
  const maintenanceReserve =
    property.propertyType === "house"
      ? (property.estimatedPrice * COST_ESTIMATES.maintenancePercentHouse) / 12
      : 0;
  const vveCosts =
    property.propertyType === "house" ? 0 : property.estimatedVvEMonthly;

  // Municipal taxes
  const ozbEstimate = (property.estimatedPrice * city.ozbRatePerMille / 100) / 12;
  const waterschapsbelasting = COST_ESTIMATES.waterschapsbelastingAnnual / 12;
  const rioolheffing = COST_ESTIMATES.rioolheffingAnnual / 12;

  const totalMonthlyGross =
    mortgagePayment + maintenanceReserve + vveCosts + ozbEstimate + waterschapsbelasting + rioolheffing;

  const taxBenefit = taxes.netMonthlyTaxEffect;
  const totalMonthlyNet = totalMonthlyGross - taxBenefit;

  return {
    transferTax,
    notaryFees,
    appraisalFees,
    mortgageOriginationFees,
    nhgPremium,
    totalOneTime,
    mortgagePayment,
    maintenanceReserve,
    vveCosts,
    ozbEstimate,
    waterschapsbelasting,
    rioolheffing,
    totalMonthlyGross,
    taxBenefit,
    totalMonthlyNet,
  };
}
