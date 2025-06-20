"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SetupProgress from "@/components/SetupProgress";

interface BudgetForm {
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

export default function BudgetSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<BudgetForm>({
    defaultValues: {
      name: "",
      strategy: "ZERO_SUM",
      period: "MONTHLY",
      startAt: new Date().toISOString().split("T")[0],
      endAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split("T")[0],
    },
  });

  const strategy = watch("strategy");
  const period = watch("period");

  const onSubmit = async (data: BudgetForm) => {
    setIsLoading(true);

    // Store budget data in sessionStorage for the setup flow
    sessionStorage.setItem("setupBudget", JSON.stringify(data));

    // Navigate to next step
    router.push("/setup/income");
  };

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
          Create Your First Budget
        </h1>
        <p className="text-gray-600">
          Let&apos;s start by setting up the basic details for your budget
        </p>
      </div>

      <SetupProgress currentStep="budget" steps={setupSteps} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Budget Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name", {
                required: "Budget name is required",
                minLength: {
                  value: 2,
                  message: "Budget name must be at least 2 characters",
                },
              })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., Monthly Budget 2024"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="strategy"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Budget Strategy
            </label>
            <select
              id="strategy"
              {...register("strategy")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="ZERO_SUM">Zero-Sum Budgeting</option>
              <option value="PERCENTAGE">Percentage-Based Budgeting</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {strategy === "ZERO_SUM"
                ? "Every dollar has a purpose - income minus expenses equals zero"
                : "Allocate a percentage of your income to each category"}
            </p>
          </div>

          <div>
            <label
              htmlFor="period"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Budget Period
            </label>
            <select
              id="period"
              {...register("period")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="ONE_TIME">One Time</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startAt"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <input
                id="startAt"
                type="date"
                {...register("startAt", {
                  required: "Start date is required",
                })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              {errors.startAt && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.startAt.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="endAt"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <input
                id="endAt"
                type="date"
                {...register("endAt", {
                  required: "End date is required",
                })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              {errors.endAt && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.endAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6">
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
