"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import type { StepType } from "./types";

interface BudgetStepsSidebarProps {
  currentStep: StepType;
  onStepClick?: (step: StepType) => void;
  /** Subset of steps to show, in order. Defaults to all steps. */
  visibleSteps?: StepType[];
  /** "sidebar" = vertical column (desktop); "horizontal" = compact row (mobile). */
  variant?: "sidebar" | "horizontal";
  className?: string;
}

const allSteps = [
  {
    step: "basic" as StepType,
    label: "Basic",
    description: "Budget basics",
  },
  {
    step: "income" as StepType,
    label: "Income",
    description: "Income sources",
  },
  {
    step: "cards" as StepType,
    label: "Cards",
    description: "Review budget cards",
  },
  {
    step: "categories" as StepType,
    label: "Categories",
    description: "Select categories",
  },
  {
    step: "allocation" as StepType,
    label: "Allocation",
    description: "Allocate funds",
  },
];

export default function BudgetStepsSidebar({
  currentStep,
  onStepClick,
  visibleSteps,
  variant = "sidebar",
  className = "",
}: BudgetStepsSidebarProps) {
  const steps = visibleSteps
    ? allSteps.filter((s) => visibleSteps.includes(s.step))
    : allSteps;

  const getStepIndex = (step: StepType) => {
    return steps.findIndex((s) => s.step === step);
  };

  const currentIndex = getStepIndex(currentStep);

  const isStepClickable = (step: StepType) => {
    const stepIndex = getStepIndex(step);
    return stepIndex <= currentIndex && !!onStepClick;
  };

  // Compact horizontal stepper for mobile: numbered dots + connectors with the
  // current step label below. Frees up the width the vertical sidebar would eat.
  if (variant === "horizontal") {
    return (
      <div
        className={`flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-4 ${className}`}
      >
        <div className="flex items-center">
          {steps.map((step, index) => {
            const stepIndex = getStepIndex(step.step);
            const isCompleted = stepIndex < currentIndex;
            const isCurrent = step.step === currentStep;
            const isClickable = isStepClickable(step.step);

            return (
              <Fragment key={step.step}>
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.step)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCurrent
                      ? "bg-secondary text-gray-900"
                      : isCompleted
                        ? "bg-black/90 text-white"
                        : "bg-gray-200 text-gray-500"
                  } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-secondary" />
                  ) : (
                    index + 1
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-1.5 h-0.5 flex-1 rounded-full transition-colors ${
                      stepIndex < currentIndex ? "bg-black/80" : "bg-gray-200"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
        <p className="mt-3 text-xs font-medium text-gray-500">
          Step {currentIndex + 1} of {steps.length} ·{" "}
          <span className="text-gray-900">{steps[currentIndex]?.label}</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`w-56 border-r border-gray-200 bg-gray-50 p-6 ${className}`}
    >
      <div className="flex flex-col space-y-8">
        {steps.map((step, index) => {
          const stepIndex = getStepIndex(step.step);
          const isCompleted = stepIndex < currentIndex;
          const isCurrent = step.step === currentStep;
          const isClickable = isStepClickable(step.step);

          return (
            <div
              key={step.step}
              className={`flex items-center ${
                isClickable ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={() => isClickable && onStepClick?.(step.step)}
            >
              {/* Step Circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "bg-secondary text-gray-900"
                    : isCompleted
                      ? "bg-black/90 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-secondary" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Info */}
              <div className="ml-4">
                <div
                  className={`text-sm font-medium ${
                    isCurrent
                      ? "text-gray-900"
                      : isCompleted
                        ? "text-gray-700"
                        : "text-gray-500"
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
