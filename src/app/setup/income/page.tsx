"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SetupProgress from "@/components/SetupProgress";

interface IncomeForm {
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
}

interface BudgetData {
  name: string;
  strategy: "ZERO_SUM" | "PERCENTAGE";
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  startAt: string;
  endAt: string;
}

const setupSteps = [
  { id: "budget", title: "Budget", description: "Basic details" },
  { id: "income", title: "Income", description: "Set your income" },
  { id: "categories", title: "Categories", description: "Choose categories" },
  { id: "allocation", title: "Allocation", description: "Allocate funds" },
  { id: "invite", title: "Invite", description: "Invite others" },
];

export default function IncomeSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("setupBudget");
    if (!stored) {
      router.push("/setup/budget");
      return;
    }
    try {
      const parsed = JSON.parse(stored) as BudgetData;
      setBudgetData(parsed);
    } catch {
      router.push("/setup/budget");
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<IncomeForm>({
    defaultValues: {
      amount: 0,
      source: "",
      description: "",
      isPlanned: false,
      frequency: "MONTHLY",
    },
  });

  const amount = watch("amount");

  const onSubmit = async (data: IncomeForm) => {
    setIsLoading(true);

    // Store income data in sessionStorage
    sessionStorage.setItem("setupIncome", JSON.stringify(data));

    // Navigate to next step
    router.push("/setup/categories");
  };

  const handleBack = () => {
    router.push("/setup/budget");
  };

  if (!budgetData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-full w-full text-secondary"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="currentColor"
            />
            <path
              d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Set Your Income
        </h1>
        <p className="text-gray-600">
          Tell us about your income for the {budgetData.period.toLowerCase()}{" "}
          budget
        </p>
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            💡 <strong>Note:</strong> You&apos;ll be able to add more income
            sources later. This is just to get you started with your primary
            income.
          </p>
        </div>
      </div>

      <SetupProgress currentStep="income" steps={setupSteps} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Income Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount", {
                  required: "Income amount is required",
                  min: {
                    value: 0.01,
                    message: "Income must be greater than 0",
                  },
                })}
                className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.amount.message}
              </p>
            )}
            {amount > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {budgetData.strategy === "ZERO_SUM"
                  ? `You'll allocate $${amount.toLocaleString()} across your categories`
                  : `You'll allocate percentages of $${amount.toLocaleString()} to your categories`}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="frequency"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Frequency
            </label>
            <select
              id="frequency"
              {...register("frequency", {
                required: "Frequency is required",
              })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="ONE_TIME">One Time</option>
            </select>
            {errors.frequency && (
              <p className="mt-1 text-sm text-red-600">
                {errors.frequency.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="source"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Income Source
            </label>
            <input
              id="source"
              type="text"
              {...register("source", {
                required: "Income source is required",
              })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., Salary, Freelance, Business"
            />
            {errors.source && (
              <p className="mt-1 text-sm text-red-600">
                {errors.source.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Additional details about your income..."
            />
          </div>

          <div className="flex items-center">
            <input
              id="isPlanned"
              type="checkbox"
              {...register("isPlanned")}
              className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
            />
            <label
              htmlFor="isPlanned"
              className="ml-2 block text-sm text-gray-700"
            >
              This is planned/expected income
            </label>
          </div>

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="hover:bg-secondary/80 rounded-md bg-secondary px-6 py-2 text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
