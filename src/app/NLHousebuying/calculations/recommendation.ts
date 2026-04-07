import type {
  WizardState,
  MortgageResult,
  TaxResult,
  CostBreakdown,
  RentVsBuyResult,
  RiskAssessment,
  RegulationCheckResult,
  FinalRecommendation,
  Recommendation,
} from "../types";
import { EMPLOYMENT_FACTORS } from "../data/regulations";
import { CITIES } from "../data/cities";

// ── Risk Assessment ────────────────────────────────────────

export function calculateRiskAssessment(
  state: WizardState,
  mortgage: MortgageResult,
  costs: CostBreakdown
): RiskAssessment {
  const { personal, purpose, property } = state;
  const factors: RiskAssessment["factors"] = [];

  // Debt-to-income ratio
  const monthlyIncome = personal.grossAnnualIncome / 12;
  const totalMonthlyDebt =
    costs.totalMonthlyNet +
    personal.otherMonthlyDebts +
    personal.monthlyStudentDebtPayment;
  const dti = monthlyIncome > 0 ? (totalMonthlyDebt / monthlyIncome) * 100 : 100;

  if (dti < 30) {
    factors.push({ label: "Debt-to-income ratio", status: "good", detail: `${dti.toFixed(0)}% — comfortable level` });
  } else if (dti < 45) {
    factors.push({ label: "Debt-to-income ratio", status: "warning", detail: `${dti.toFixed(0)}% — moderate, watch spending` });
  } else {
    factors.push({ label: "Debt-to-income ratio", status: "danger", detail: `${dti.toFixed(0)}% — high debt burden` });
  }

  // Employment stability
  const empFactor = EMPLOYMENT_FACTORS[personal.employmentType];
  if (empFactor.stabilityScore >= 80) {
    factors.push({ label: "Employment stability", status: "good", detail: empFactor.note });
  } else if (empFactor.stabilityScore >= 50) {
    factors.push({ label: "Employment stability", status: "warning", detail: empFactor.note });
  } else {
    factors.push({ label: "Employment stability", status: "danger", detail: empFactor.note });
  }

  // Savings buffer
  const monthsOfExpenses = monthlyIncome > 0
    ? personal.currentSavings / costs.totalMonthlyNet
    : 0;
  const savingsCoversOneTime = personal.currentSavings >= costs.totalOneTime;
  if (savingsCoversOneTime && monthsOfExpenses > 6) {
    factors.push({ label: "Savings buffer", status: "good", detail: `Covers one-time costs + ${monthsOfExpenses.toFixed(0)} months reserve` });
  } else if (savingsCoversOneTime) {
    factors.push({ label: "Savings buffer", status: "warning", detail: `Covers one-time costs but only ${monthsOfExpenses.toFixed(0)} months reserve` });
  } else {
    factors.push({ label: "Savings buffer", status: "danger", detail: `Savings don't cover one-time buying costs (€${costs.totalOneTime.toLocaleString("nl-NL", { maximumFractionDigits: 0 })})` });
  }

  // Mortgage feasibility
  if (mortgage.canFinance) {
    factors.push({ label: "Mortgage feasibility", status: "good", detail: "Property is within your borrowing capacity" });
  } else {
    factors.push({ label: "Mortgage feasibility", status: "danger", detail: `Shortfall of €${mortgage.shortfall.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}` });
  }

  // Age factor
  const age = personal.age ?? 0;
  if (age >= 25 && age <= 45) {
    factors.push({ label: "Age profile", status: "good", detail: "Optimal age range for mortgage approval" });
  } else if (age >= 18 && age < 25) {
    factors.push({ label: "Age profile", status: "warning", detail: "Young buyer — may need longer income history" });
  } else if (age > 45) {
    factors.push({ label: "Age profile", status: "warning", detail: "Shorter amortization period may be required" });
  }

  // 30% ruling expiry
  if (personal.has30PercentRuling) {
    const monthsLeft = personal.thirtyPercentRulingMonthsRemaining;
    if (monthsLeft !== null && monthsLeft <= 12) {
      factors.push({ label: "30% ruling expiry", status: "danger", detail: `Expires in ${monthsLeft} months — net income will drop significantly` });
    } else if (monthsLeft !== null && monthsLeft <= 24) {
      factors.push({ label: "30% ruling expiry", status: "warning", detail: `Expires in ${monthsLeft} months — plan for reduced net income` });
    } else if (monthsLeft !== null) {
      factors.push({ label: "30% ruling", status: "good", detail: `${monthsLeft} months remaining — provides extra disposable income` });
    }
  }

  // Stay duration
  const durationMap = { "<3y": 2, "3-5y": 4, "5-10y": 7, "10+y": 12 };
  const stayYears = durationMap[state.purpose.stayDuration];
  if (stayYears >= 7) {
    factors.push({ label: "Time horizon", status: "good", detail: `${state.purpose.stayDuration} — long enough to build equity and offset costs` });
  } else if (stayYears >= 4) {
    factors.push({ label: "Time horizon", status: "warning", detail: `${state.purpose.stayDuration} — may break even, but tight` });
  } else {
    factors.push({ label: "Time horizon", status: "danger", detail: `${state.purpose.stayDuration} — too short to recover buying costs` });
  }

  // Calculate scores
  const employmentStabilityScore = empFactor.stabilityScore;
  const financialHealthScore = Math.max(0, Math.min(100,
    (savingsCoversOneTime ? 40 : 10) +
    (dti < 30 ? 30 : dti < 45 ? 15 : 0) +
    (mortgage.canFinance ? 30 : 5)
  ));

  const goodCount = factors.filter((f) => f.status === "good").length;
  const dangerCount = factors.filter((f) => f.status === "danger").length;
  const overallScore = Math.max(0, Math.min(100,
    (goodCount / factors.length) * 80 + 20 - dangerCount * 10
  ));

  const city = CITIES[state.purpose.targetCity] ?? CITIES.other;
  const pricePerSqm = property.estimatedPrice > 0
    ? property.estimatedPrice / Math.max(30, property.estimatedPrice / city.averagePropertyPriceSqm)
    : 0;
  const marketRiskLevel: RiskAssessment["marketRiskLevel"] =
    pricePerSqm > city.averagePropertyPriceSqm * 1.3
      ? "high"
      : pricePerSqm > city.averagePropertyPriceSqm * 0.9
        ? "medium"
        : "low";

  return {
    overallScore: Math.round(overallScore),
    debtToIncomeRatio: Math.round(dti),
    employmentStabilityScore,
    financialHealthScore: Math.round(financialHealthScore),
    marketRiskLevel,
    factors,
  };
}

// ── Regulation Checks ──────────────────────────────────────

export function calculateRegulationChecks(
  state: WizardState
): RegulationCheckResult {
  const { purpose, property } = state;
  const regs = state.regulationYear === 2025
    ? { wwsPointsSocialMax: 143, wwsPointsMidRentMax: 186, midRentRangeMax: 1185, rentIncreaseFree: 0.041, rentIncreaseMid: 0.077 }
    : { wwsPointsSocialMax: 143, wwsPointsMidRentMax: 186, midRentRangeMax: 1185, rentIncreaseFree: 0.041, rentIncreaseMid: 0.077 };

  const city = CITIES[state.purpose.targetCity] ?? CITIES.other;

  // Opkoopbescherming
  const opkoopbeschermingApplies =
    city.opkoopbeschermingWozCap > 0 &&
    property.estimatedPrice <= city.opkoopbeschermingWozCap;

  // Estimate WWS points (simplified based on property price and type)
  const estimatedSqm = Math.max(
    30,
    Math.min(200, property.estimatedPrice / city.averagePropertyPriceSqm)
  );
  // Rough estimation: ~1.5 points per sqm + bonuses for energy label and amenities
  const energyBonus: Record<string, number> = {
    "A+++": 50, "A++": 45, "A+": 40, "A": 35, "B": 25, "C": 15, "D": 5, "E": 0, "F": -5, "G": -10,
  };
  const estimatedWwsPoints = Math.round(
    estimatedSqm * 1.5 + (energyBonus[property.energyLabel] ?? 0) + 20
  );

  // Determine sector
  let wwsSector: RegulationCheckResult["wwsSector"];
  let maxAllowedRent: number | null = null;
  let rentIncreaseCapPercent: number;

  if (estimatedWwsPoints <= regs.wwsPointsSocialMax) {
    wwsSector = "social";
    maxAllowedRent = estimatedWwsPoints * 5.5;
    rentIncreaseCapPercent = regs.rentIncreaseMid * 100;
  } else if (estimatedWwsPoints <= regs.wwsPointsMidRentMax) {
    wwsSector = "mid-rent";
    maxAllowedRent = regs.midRentRangeMax;
    rentIncreaseCapPercent = regs.rentIncreaseMid * 100;
  } else {
    wwsSector = "free";
    maxAllowedRent = null;
    rentIncreaseCapPercent = regs.rentIncreaseFree * 100;
  }

  const rentalPermitNeeded =
    purpose.purposes.includes("buy-to-let") && opkoopbeschermingApplies;

  return {
    opkoopbeschermingApplies,
    opkoopbeschermingWozCap: city.opkoopbeschermingWozCap > 0 ? city.opkoopbeschermingWozCap : null,
    estimatedWwsPoints,
    wwsSector,
    maxAllowedRent: maxAllowedRent ? Math.round(maxAllowedRent) : null,
    rentIncreaseCapPercent,
    rentalPermitNeeded,
  };
}

// ── Final Recommendation ───────────────────────────────────

export function calculateRecommendation(
  state: WizardState,
  mortgage: MortgageResult,
  taxes: TaxResult,
  costs: CostBreakdown,
  rentVsBuy: RentVsBuyResult,
  risk: RiskAssessment
): FinalRecommendation {
  const { personal, purpose } = state;
  const reasoning: string[] = [];

  // Students get special handling
  if (personal.employmentType === "student") {
    return {
      verdict: "RENT",
      confidence: 90,
      reasoning: [
        "As a student, you generally cannot qualify for a mortgage in the Netherlands.",
        "Focus on building income and savings first.",
        "Consider revisiting once you have stable employment.",
      ],
      actionItems: [
        "Build up savings during your studies",
        "Research your future earning potential in your field",
        "Look into social housing options (sociale huurwoning)",
      ],
      resources: [
        { label: "DUO Student Finance", url: "https://duo.nl" },
        { label: "Social Housing Guide", url: "https://www.rijksoverheid.nl/onderwerpen/huurwoning" },
      ],
    };
  }

  // Score each dimension (0-100)

  // 1. Financial feasibility (25%)
  let feasibilityScore = 0;
  if (mortgage.canFinance) {
    feasibilityScore += 50;
    reasoning.push("Your income supports the mortgage for this property.");
  } else {
    reasoning.push(`You have a mortgage shortfall of €${mortgage.shortfall.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}.`);
  }
  if (personal.currentSavings >= costs.totalOneTime) {
    feasibilityScore += 30;
  } else {
    reasoning.push(`You need €${(costs.totalOneTime - personal.currentSavings).toLocaleString("nl-NL", { maximumFractionDigits: 0 })} more in savings to cover one-time buying costs.`);
  }
  if (risk.debtToIncomeRatio < 35) {
    feasibilityScore += 20;
  }

  // 2. Cost efficiency (20%)
  let costScore = 0;
  if (rentVsBuy.monthlyCostBuying < rentVsBuy.estimatedMonthlyRent) {
    costScore = 80;
    reasoning.push(`Buying (€${rentVsBuy.monthlyCostBuying}/mo) is cheaper than renting (€${rentVsBuy.estimatedMonthlyRent}/mo) monthly.`);
  } else {
    const premium = rentVsBuy.monthlyCostBuying - rentVsBuy.estimatedMonthlyRent;
    costScore = Math.max(0, 60 - (premium / rentVsBuy.estimatedMonthlyRent) * 100);
    if (premium > 300) {
      reasoning.push(`Buying costs €${premium}/mo more than renting in this area.`);
    }
  }

  // 3. Time horizon (20%)
  const durationMap = { "<3y": 2, "3-5y": 4, "5-10y": 7, "10+y": 12 };
  const stayYears = durationMap[state.purpose.stayDuration];
  let timeScore = 0;
  if (stayYears >= rentVsBuy.breakEvenYears) {
    timeScore = 85;
    reasoning.push(`Your ${state.purpose.stayDuration} stay exceeds the ${rentVsBuy.breakEvenYears}-year break-even point.`);
  } else if (stayYears >= rentVsBuy.breakEvenYears - 1) {
    timeScore = 50;
  } else {
    timeScore = 15;
    reasoning.push(`Your ${state.purpose.stayDuration} stay is shorter than the ${rentVsBuy.breakEvenYears}-year break-even, making buying less economical.`);
  }

  // 4. Risk profile (15%)
  let riskScore = risk.overallScore;

  // 5. Tax advantage (10%)
  let taxScore = 0;
  if (taxes.netMonthlyTaxEffect > 200) {
    taxScore = 90;
    reasoning.push(`Strong tax benefit of €${Math.round(taxes.netMonthlyTaxEffect)}/mo through hypotheekrenteaftrek.`);
  } else if (taxes.netMonthlyTaxEffect > 100) {
    taxScore = 60;
  } else if (taxes.netMonthlyTaxEffect > 0) {
    taxScore = 30;
  } else {
    taxScore = 10;
  }
  if (taxes.starterExemptionEligible) {
    taxScore = Math.min(100, taxScore + 15);
    reasoning.push("You qualify for the startersvrijstelling (0% transfer tax).");
  }

  // 30% ruling risk
  if (personal.has30PercentRuling && personal.thirtyPercentRulingMonthsRemaining !== null) {
    const monthsLeft = personal.thirtyPercentRulingMonthsRemaining;
    if (monthsLeft <= 12) {
      feasibilityScore = Math.max(0, feasibilityScore - 15);
      reasoning.push(`Your 30% ruling expires in ${monthsLeft} months — ensure affordability on regular salary.`);
    } else if (monthsLeft <= 24) {
      feasibilityScore = Math.max(0, feasibilityScore - 5);
    }
  }

  // 6. Market context (10%)
  let marketScore = 50;
  if (risk.marketRiskLevel === "low") marketScore = 75;
  if (risk.marketRiskLevel === "high") marketScore = 25;

  // Weighted total
  const totalScore =
    feasibilityScore * 0.25 +
    costScore * 0.20 +
    timeScore * 0.20 +
    riskScore * 0.15 +
    taxScore * 0.10 +
    marketScore * 0.10;

  // Determine verdict
  let verdict: Recommendation;
  if (totalScore >= 65) {
    verdict = "BUY";
  } else if (totalScore >= 40) {
    verdict = "WAIT";
  } else {
    verdict = "RENT";
  }

  // Confidence based on distance from nearest threshold
  const distBuy = Math.abs(totalScore - 65);
  const distRent = Math.abs(totalScore - 40);
  const minDist = Math.min(distBuy, distRent);
  const confidence = Math.min(95, Math.max(40, 50 + minDist * 2));

  // Action items
  const actionItems: string[] = [];
  if (verdict === "BUY") {
    actionItems.push("Get a mortgage pre-approval from a hypotheekadviseur");
    actionItems.push("Check NHG eligibility for better rates");
    if (taxes.starterExemptionEligible) {
      actionItems.push("Confirm startersvrijstelling eligibility with your notary");
    }
    actionItems.push("Start viewing properties in your target area");
    actionItems.push("Budget for one-time costs: €" + costs.totalOneTime.toLocaleString("nl-NL", { maximumFractionDigits: 0 }));
  } else if (verdict === "WAIT") {
    if (!mortgage.canFinance) {
      actionItems.push("Increase savings or income to close the mortgage gap");
    }
    actionItems.push("Monitor interest rates and housing prices");
    actionItems.push("Consider a smaller property or different location");
    actionItems.push("Consult a mortgage advisor about your specific situation");
  } else {
    actionItems.push("Continue renting and building savings");
    actionItems.push("Focus on increasing income and reducing debt");
    actionItems.push("Reassess in 6-12 months");
  }

  return {
    verdict,
    confidence: Math.round(confidence),
    reasoning: reasoning.slice(0, 5),
    actionItems,
    resources: [
      { label: "Nationale Hypotheek Garantie (NHG)", url: "https://nhg.nl" },
      { label: "Nibud Budget Calculator", url: "https://www.nibud.nl" },
      { label: "Kadaster Property Registry", url: "https://www.kadaster.nl" },
      { label: "Rijksoverheid Housing Info", url: "https://www.rijksoverheid.nl/onderwerpen/koopwoning" },
      { label: "Hypotheker Mortgage Calculator", url: "https://www.hypotheker.nl" },
    ],
  };
}
