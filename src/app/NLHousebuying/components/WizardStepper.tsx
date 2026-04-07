import type { WizardStep } from "../types";

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Your Profile" },
  { step: 2, label: "Goals" },
  { step: 3, label: "Property" },
  { step: 4, label: "Analysis" },
  { step: 5, label: "Compare" },
  { step: 6, label: "Decision" },
];

interface WizardStepperProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between max-w-xl mx-auto">
      {STEPS.map(({ step, label }, i) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isClickable = step < currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              className={`flex flex-col items-center gap-1.5 ${
                isClickable ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? "bg-[#ff385c] text-white"
                    : isActive
                      ? "bg-[#222222] text-white"
                      : "border-2 border-[#c1c1c1] text-[#c1c1c1]"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isActive
                    ? "text-[#222222]"
                    : isCompleted
                      ? "text-[#ff385c]"
                      : "text-[#c1c1c1]"
                }`}
              >
                {label}
              </span>
            </button>

            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                  step < currentStep ? "bg-[#ff385c]" : "bg-[#e8e8e8]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
