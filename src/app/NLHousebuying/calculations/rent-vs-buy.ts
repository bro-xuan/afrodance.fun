import type {
  PurposeGoals,
  PropertyDetails,
  CostBreakdown,
  RentVsBuyResult,
  RegulationYear,
} from "../types";
import { REGULATIONS, MORTGAGE_RULES } from "../data/regulations";
import { CITIES } from "../data/cities";
import { calculatePrincipalPaidInYear, calculateAnnuityPayment } from "./mortgage";

const DISCOUNT_RATE = 0.03;
const ANALYSIS_YEARS = 10;

function computeBreakeven(
  propertyPrice: number,
  monthlyCostBuying: number,
  totalOneTime: number,
  estimatedMonthlyRent: number,
  annualRentIncrease: number,
  annualAppreciationRate: number,
  rate: number,
  termYears: number,
): number {
  let cumulativeRent = 0;
  let cumulativeBuy = totalOneTime;
  let cumulativePrincipalPaid = 0;

  for (let y = 1; y <= ANALYSIS_YEARS; y++) {
    const rentThisYear =
      estimatedMonthlyRent * Math.pow(1 + annualRentIncrease, y - 1) * 12;
    cumulativeRent += rentThisYear;
    cumulativeBuy += monthlyCostBuying * 12;

    const principalPaidThisYear = calculatePrincipalPaidInYear(
      propertyPrice,
      rate,
      termYears,
      y
    );
    cumulativePrincipalPaid += principalPaidThisYear;

    const appreciationValue =
      propertyPrice * Math.pow(1 + annualAppreciationRate, y) - propertyPrice;

    const totalEquity = appreciationValue + cumulativePrincipalPaid;
    const adjustedBuy = cumulativeBuy - totalEquity;
    if (adjustedBuy < cumulativeRent) {
      return y;
    }
  }

  return ANALYSIS_YEARS + 1;
}

export function calculateRentVsBuy(
  purpose: PurposeGoals,
  property: PropertyDetails,
  costs: CostBreakdown,
  year: RegulationYear,
  rentOverride?: number | null,
): RentVsBuyResult {
  const regs = REGULATIONS[year];
  const city = CITIES[purpose.targetCity] ?? CITIES.other;

  // Estimate rent based on city average and estimated property size, or use override
  const estimatedSqm = Math.max(
    30,
    Math.min(200, property.estimatedPrice / city.averagePropertyPriceSqm)
  );
  const estimatedMonthlyRent = rentOverride ?? estimatedSqm * city.averageRentPerSqm;

  const monthlyCostBuying = costs.totalMonthlyNet;
  const annualRentIncrease = regs.rentIncreaseFree;
  const rate = MORTGAGE_RULES.defaultInterestRate;

  // Yearly comparison
  const yearlyComparison: RentVsBuyResult["yearlyComparison"] = [];
  let cumulativeRent = 0;
  let cumulativeBuy = costs.totalOneTime;
  let cumulativePrincipalPaid = 0;

  let breakEvenYears = ANALYSIS_YEARS + 1;

  for (let y = 1; y <= ANALYSIS_YEARS; y++) {
    const rentThisYear =
      estimatedMonthlyRent * Math.pow(1 + annualRentIncrease, y - 1) * 12;
    cumulativeRent += rentThisYear;
    cumulativeBuy += monthlyCostBuying * 12;

    const principalPaidThisYear = calculatePrincipalPaidInYear(
      property.estimatedPrice,
      rate,
      MORTGAGE_RULES.defaultTermYears,
      y
    );
    cumulativePrincipalPaid += principalPaidThisYear;

    const appreciationValue =
      property.estimatedPrice * Math.pow(1 + city.annualAppreciationRate, y) -
      property.estimatedPrice;

    yearlyComparison.push({
      year: y,
      cumulativeRent: Math.round(cumulativeRent),
      cumulativeBuy: Math.round(cumulativeBuy),
    });

    if (breakEvenYears > ANALYSIS_YEARS) {
      const totalEquity = appreciationValue + cumulativePrincipalPaid;
      const adjustedBuy = cumulativeBuy - totalEquity;
      if (adjustedBuy < cumulativeRent) {
        breakEvenYears = y;
      }
    }
  }

  // NPV calculations
  let npv10YearRent = 0;
  let npv10YearBuy = costs.totalOneTime;
  for (let y = 1; y <= ANALYSIS_YEARS; y++) {
    const discountFactor = Math.pow(1 + DISCOUNT_RATE, y);
    const rentYear =
      estimatedMonthlyRent * Math.pow(1 + annualRentIncrease, y - 1) * 12;
    npv10YearRent += rentYear / discountFactor;
    npv10YearBuy += (monthlyCostBuying * 12) / discountFactor;
  }

  // Interest rate sensitivity
  const sensitivityRates = [
    MORTGAGE_RULES.interestRateLow,
    MORTGAGE_RULES.defaultInterestRate,
    MORTGAGE_RULES.interestRateHigh,
  ];
  const rateSensitivity = sensitivityRates.map((r) => {
    const monthlyPayment = calculateAnnuityPayment(
      property.estimatedPrice,
      r,
      MORTGAGE_RULES.defaultTermYears
    );
    // Recompute monthly buying cost with different rate
    const monthlyCostAtRate = costs.totalMonthlyNet - costs.mortgagePayment + monthlyPayment;
    return {
      rate: r,
      breakEvenYears: Math.min(
        computeBreakeven(
          property.estimatedPrice,
          monthlyCostAtRate,
          costs.totalOneTime,
          estimatedMonthlyRent,
          annualRentIncrease,
          city.annualAppreciationRate,
          r,
          MORTGAGE_RULES.defaultTermYears,
        ),
        ANALYSIS_YEARS + 1
      ),
      monthlyCost: Math.round(monthlyCostAtRate),
    };
  });

  return {
    estimatedMonthlyRent: Math.round(estimatedMonthlyRent),
    monthlyCostBuying: Math.round(monthlyCostBuying),
    breakEvenYears: Math.min(breakEvenYears, ANALYSIS_YEARS + 1),
    npv10YearRent: Math.round(npv10YearRent),
    npv10YearBuy: Math.round(npv10YearBuy),
    yearlyComparison,
    rateSensitivity,
  };
}
