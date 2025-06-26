"use client";

import { Check } from "lucide-react";
import type { StepType } from "./types";

interface BudgetStepsSidebarProps {
  currentStep: StepType;
  onStepClick?: (step: StepType) => void;
}

const steps = [
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
}: BudgetStepsSidebarProps) {
  const getStepIndex = (step: StepType) => {
    return steps.findIndex((s) => s.step === step);
  };

  const isStepClickable = (step: StepType) => {
    const stepIndex = getStepIndex(step);
    const currentIndex = getStepIndex(currentStep);
    return stepIndex <= currentIndex && onStepClick;
  };

  return (
    <div className="w-56 border-r border-gray-200 bg-gray-50 p-6">
      <div className="flex flex-col space-y-8">
        {steps.map((step, index) => {
          const stepIndex = getStepIndex(step.step);
          const currentIndex = getStepIndex(currentStep);
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
