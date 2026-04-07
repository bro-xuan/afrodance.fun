import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WizardState, CalculationOverrides } from "../types";
import { calculateMortgage } from "../calculations/mortgage";
import { calculateTaxes } from "../calculations/taxes";
import { calculateCosts } from "../calculations/costs";
import { calculateRentVsBuy } from "../calculations/rent-vs-buy";
import {
  calculateRiskAssessment,
  calculateRegulationChecks,
  calculateRecommendation,
} from "../calculations/recommendation";
import { CITIES } from "../data/cities";
import { REGULATIONS } from "../data/regulations";

import { MortgagePanel } from "./panels/MortgagePanel";
import { CostBreakdownPanel } from "./panels/CostBreakdownPanel";
import { RentVsBuyPanel } from "./panels/RentVsBuyPanel";
import { RegulationChecksPanel } from "./panels/RegulationChecksPanel";
import { RiskAssessmentPanel } from "./panels/RiskAssessmentPanel";
import { RecommendationPanel } from "./panels/RecommendationPanel";
import { BreakevenExplorer } from "./panels/BreakevenExplorer";
import { NHGSafetyNetPanel } from "./panels/NHGSafetyNetPanel";

export function useAnalysis(state: WizardState) {
  const year = state.regulationYear;

  const mortgage = useMemo(
    () => calculateMortgage(state.personal, state.property.estimatedPrice, year, state.purpose.purposes, state.overrides),
    [state.personal, state.property.estimatedPrice, year, state.purpose.purposes, state.overrides]
  );

  const taxes = useMemo(
    () => calculateTaxes(state.personal, state.purpose, state.property.estimatedPrice, year),
    [state.personal, state.purpose, state.property.estimatedPrice, year]
  );

  const costs = useMemo(
    () => calculateCosts(state.personal, state.purpose, state.property, mortgage, taxes, year),
    [state.personal, state.purpose, state.property, mortgage, taxes, year]
  );

  const effectiveRentOverride = state.overrides.monthlyRent ?? state.property.currentMonthlyRent;

  const rentVsBuy = useMemo(
    () => calculateRentVsBuy(state.purpose, state.property, costs, year, effectiveRentOverride),
    [state.purpose, state.property, costs, year, effectiveRentOverride]
  );

  const risk = useMemo(
    () => calculateRiskAssessment(state, mortgage, costs),
    [state, mortgage, costs]
  );

  const regulations = useMemo(
    () => calculateRegulationChecks(state),
    [state]
  );

  const recommendation = useMemo(
    () => calculateRecommendation(state, mortgage, taxes, costs, rentVsBuy, risk),
    [state, mortgage, taxes, costs, rentVsBuy, risk]
  );

  const city = CITIES[state.purpose.targetCity] ?? CITIES.other;

  return { mortgage, taxes, costs, rentVsBuy, risk, regulations, recommendation, city };
}

interface Props {
  state: WizardState;
  onOverrideChange: (payload: Partial<CalculationOverrides>) => void;
  onBack: () => void;
  onNext: () => void;
  analysis: ReturnType<typeof useAnalysis>;
}

export function AnalysisDashboard({ state, onOverrideChange, onBack, onNext, analysis }: Props) {
  const year = state.regulationYear;
  const { mortgage, rentVsBuy, risk, regulations, costs, city } = analysis;
  const cityName = city.name;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="text-center mb-2">
        <h2
          className="text-[22px] font-semibold text-[#222222]"
          style={{ letterSpacing: "-0.44px" }}
        >
          Your Analysis
        </h2>
        <p className="text-sm text-[#6a6a6a] mt-1">
          Based on {year} regulations — tailored to <strong>{cityName}</strong> market data
        </p>
        <p className="text-xs text-[#428bff] mt-0.5">
          {cityName} avg: €{city.averagePropertyPriceSqm.toLocaleString("nl-NL")}/m², {(city.annualAppreciationRate * 100).toFixed(1)}% annual growth, +{city.averageOverbiddingPercent}% overbidding
        </p>
      </div>

      {/* Mortgage capacity with editable overrides */}
      <MortgagePanel
        result={mortgage}
        hasPartner={state.personal.hasPartner}
        overrides={state.overrides}
        onOverrideChange={onOverrideChange}
      />

      {/* Cost breakdown */}
      <CostBreakdownPanel costs={costs} />

      {/* Rent vs buy */}
      <RentVsBuyPanel
        result={rentVsBuy}
        cityName={cityName}
        rentOverride={state.overrides.monthlyRent}
        onRentOverrideChange={(value) => onOverrideChange({ monthlyRent: value })}
      />

      {/* Risk assessment */}
      <RiskAssessmentPanel risk={risk} />

      {/* Regulation checks */}
      <RegulationChecksPanel
        result={regulations}
        purposes={state.purpose.purposes}
        cityName={cityName}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8] transition-all active:scale-[0.96]"
        >
          &larr; Edit property
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg text-sm font-medium bg-[#222222] text-white hover:bg-[#ff385c] transition-all active:scale-[0.96]"
        >
          See Decision &rarr;
        </button>
      </div>
    </div>
  );
}

interface CompareProps {
  state: WizardState;
  analysis: ReturnType<typeof useAnalysis>;
  onBack: () => void;
  onNext: () => void;
}

export function CompareStep({ state, analysis, onBack, onNext }: CompareProps) {
  const regs = REGULATIONS[state.regulationYear];

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2
          className="text-[22px] font-semibold text-[#222222]"
          style={{ letterSpacing: "-0.44px" }}
        >
          Rent vs. Buy Comparison
        </h2>
        <p className="text-sm text-[#6a6a6a] mt-1">
          See when buying breaks even against renting in your situation
        </p>
      </div>

      <BreakevenExplorer
        propertyPrice={state.property.estimatedPrice}
        monthlyCostBuying={analysis.costs.totalMonthlyNet}
        estimatedMonthlyRent={analysis.rentVsBuy.estimatedMonthlyRent}
        totalOneTimeCosts={analysis.costs.totalOneTime}
        mortgageRate={analysis.mortgage.interestRate}
        annualRentIncrease={regs.rentIncreaseFree}
        cityAppreciationRate={analysis.city.annualAppreciationRate}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8] transition-all active:scale-[0.96]"
        >
          &larr; Back to analysis
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg text-sm font-medium bg-[#222222] text-white hover:bg-[#ff385c] transition-all active:scale-[0.96]"
        >
          See Decision &rarr;
        </button>
      </div>
    </div>
  );
}

interface DecisionProps {
  state: WizardState;
  analysis: ReturnType<typeof useAnalysis>;
  onBack: () => void;
  onReset: () => void;
}

export function DecisionStep({ state, analysis, onBack, onReset }: DecisionProps) {
  const [showNHG, setShowNHG] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeModal = useCallback(() => {
    setShowNHG(false);
    triggerRef.current?.focus();
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!showNHG) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showNHG]);

  // Escape key handler
  useEffect(() => {
    if (!showNHG) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showNHG, closeModal]);

  // Auto-focus modal on open
  useEffect(() => {
    if (showNHG) modalRef.current?.focus();
  }, [showNHG]);

  const hasProperty = state.property.estimatedPrice > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2
          className="text-[22px] font-semibold text-[#222222]"
          style={{ letterSpacing: "-0.44px" }}
        >
          Our Recommendation
        </h2>
        <p className="text-sm text-[#6a6a6a] mt-1">
          Based on your profile, finances, and market analysis
        </p>
      </div>

      <RecommendationPanel recommendation={analysis.recommendation} />

      {/* NHG Safety Net trigger */}
      {hasProperty && (
        <div className="text-center">
          <button
            ref={triggerRef}
            onClick={() => setShowNHG(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-[#eef5ff] text-[#428bff] hover:bg-[#ddeaff] transition-all active:scale-[0.96]"
          >
            <span>🛡️</span>
            What if I can&apos;t pay my mortgage? Learn about NHG
          </button>
        </div>
      )}

      {/* NHG modal */}
      {showNHG && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="NHG Safety Net information"
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-3xl mx-4 my-8 sm:my-12">
            {/* Close button */}
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-[#222222] text-white flex items-center justify-center shadow-lg hover:bg-[#ff385c] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <NHGSafetyNetPanel
              mortgage={analysis.mortgage}
              propertyPrice={state.property.estimatedPrice}
              year={state.regulationYear}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8] transition-all active:scale-[0.96]"
        >
          &larr; Back to comparison
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-[#222222] text-white hover:bg-[#ff385c] transition-all active:scale-[0.96]"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
