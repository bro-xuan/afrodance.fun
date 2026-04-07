"use client";

import Link from "next/link";
import { useReducer, useMemo } from "react";
import type { WizardState, WizardAction, RegulationYear } from "./types";
import { WizardStepper } from "./components/WizardStepper";
import { StepPersonalProfile } from "./components/StepPersonalProfile";
import { StepPurposeGoals } from "./components/StepPurposeGoals";
import { StepPropertyDetails } from "./components/StepPropertyDetails";
import { AnalysisDashboard, CompareStep, DecisionStep, useAnalysis } from "./components/AnalysisDashboard";

const initialState: WizardState = {
  currentStep: 1,
  regulationYear: 2026,
  personal: {
    age: null,
    hasPartner: false,
    employmentType: "vast",
    partnerEmploymentType: null,
    grossAnnualIncome: 0,
    partnerGrossAnnualIncome: 0,
    hasStudentDebt: false,
    studentDebtSystem: "new",
    monthlyStudentDebtPayment: 0,
    otherMonthlyDebts: 0,
    currentSavings: 0,
    isFirstTimeBuyer: true,
    has30PercentRuling: false,
    thirtyPercentRulingMonthsRemaining: null,
  },
  purpose: {
    purposes: ["self-living"],
    targetCity: "amsterdam",
    stayDuration: "5-10y",
    riskTolerance: "medium",
  },
  property: {
    propertyType: "apartment",
    estimatedPrice: 0,
    energyLabel: "C",
    estimatedVvEMonthly: 150,
    currentMonthlyRent: null,
  },
  overrides: {
    maxMortgage: null,
    interestRate: null,
    monthlyPayment: null,
    monthlyRent: null,
  },
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "UPDATE_PERSONAL":
      return { ...state, personal: { ...state.personal, ...action.payload } };
    case "UPDATE_PURPOSE":
      return { ...state, purpose: { ...state.purpose, ...action.payload } };
    case "UPDATE_PROPERTY":
      return { ...state, property: { ...state.property, ...action.payload } };
    case "UPDATE_OVERRIDES":
      return { ...state, overrides: { ...state.overrides, ...action.payload } };
    case "SET_YEAR":
      return { ...state, regulationYear: action.year };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const FONT_STACK =
  '-apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function NLHousebuyingPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const yearOptions: RegulationYear[] = useMemo(() => [2025, 2026], []);
  const analysis = useAnalysis(state);

  return (
    <main
      className="min-h-screen bg-white"
      style={{ fontFamily: FONT_STACK }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[#222222] hover:text-[#ff385c] transition-colors mb-8"
          style={{ fontFamily: FONT_STACK }}
        >
          <span>&larr;</span> back to afrodance.fun
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-5xl sm:text-6xl mb-4">🏠🇳🇱</div>
          <h1
            className="text-[28px] sm:text-[32px] font-bold text-[#222222] mb-3"
            style={{ letterSpacing: "-0.44px" }}
          >
            Should You Buy a House in the Netherlands?
          </h1>
          <p className="text-[#6a6a6a] text-base max-w-2xl mx-auto mb-6">
            A comprehensive decision tool based on real Dutch regulations, tax
            rules, and city-specific market data. All numbers are tailored to your selected city.
          </p>

          {/* Year toggle */}
          <div className="inline-flex items-center gap-1 bg-[#f2f2f2] rounded-full p-1">
            {yearOptions.map((year) => (
              <button
                key={year}
                onClick={() => dispatch({ type: "SET_YEAR", year })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  state.regulationYear === year
                    ? "bg-[#222222] text-white shadow-sm"
                    : "text-[#6a6a6a] hover:text-[#222222]"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6a6a6a] mt-2">
            Regulation year (NHG limits, tax rates, etc.)
          </p>
        </div>

        {/* Wizard stepper */}
        <WizardStepper
          currentStep={state.currentStep}
          onStepClick={(step) => {
            if (step < state.currentStep) {
              dispatch({ type: "SET_STEP", step });
            }
          }}
        />

        {/* Step content */}
        <div className="mt-8">
          {state.currentStep === 1 && (
            <StepPersonalProfile
              data={state.personal}
              onChange={(payload) =>
                dispatch({ type: "UPDATE_PERSONAL", payload })
              }
              onNext={() => dispatch({ type: "SET_STEP", step: 2 })}
            />
          )}
          {state.currentStep === 2 && (
            <StepPurposeGoals
              data={state.purpose}
              onChange={(payload) =>
                dispatch({ type: "UPDATE_PURPOSE", payload })
              }
              onBack={() => dispatch({ type: "SET_STEP", step: 1 })}
              onNext={() => dispatch({ type: "SET_STEP", step: 3 })}
            />
          )}
          {state.currentStep === 3 && (
            <StepPropertyDetails
              data={state.property}
              onChange={(payload) =>
                dispatch({ type: "UPDATE_PROPERTY", payload })
              }
              onBack={() => dispatch({ type: "SET_STEP", step: 2 })}
              onNext={() => dispatch({ type: "SET_STEP", step: 4 })}
            />
          )}
          {state.currentStep === 4 && (
            <AnalysisDashboard
              state={state}
              onOverrideChange={(payload) =>
                dispatch({ type: "UPDATE_OVERRIDES", payload })
              }
              onBack={() => dispatch({ type: "SET_STEP", step: 3 })}
              onNext={() => dispatch({ type: "SET_STEP", step: 5 })}
              analysis={analysis}
            />
          )}
          {state.currentStep === 5 && (
            <CompareStep
              state={state}
              analysis={analysis}
              onBack={() => dispatch({ type: "SET_STEP", step: 4 })}
              onNext={() => dispatch({ type: "SET_STEP", step: 6 })}
            />
          )}
          {state.currentStep === 6 && (
            <DecisionStep
              state={state}
              analysis={analysis}
              onBack={() => dispatch({ type: "SET_STEP", step: 5 })}
              onReset={() => dispatch({ type: "RESET" })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#f2f2f2] text-center">
          <p className="text-xs text-[#6a6a6a]">
            This tool provides estimates based on publicly available Dutch
            regulations. It is not financial advice. Always consult a licensed
            mortgage advisor (hypotheekadviseur) for personalized guidance.
          </p>
        </div>
      </div>
    </main>
  );
}
