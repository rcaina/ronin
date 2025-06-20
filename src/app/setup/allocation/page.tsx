"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import SetupProgress from "@/components/SetupProgress";

interface BudgetData {
  name: string;
  strategy: "ZERO_SUM" | "PERCENTAGE";
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  startAt: string;
  endAt: string;
}

interface IncomeData {
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
}

type AllocationData = Record<string, number>;

const setupSteps = [
  { id: "budget", title: "Budget", description: "Basic details" },
  { id: "income", title: "Income", description: "Set your income" },
  { id: "categories", title: "Categories", description: "Choose categories" },
  { id: "allocation", title: "Allocation", description: "Allocate funds" },
  { id: "invite", title: "Invite", description: "Invite others" },
];

export default function AllocationSetupPage() {
  const router = useRouter();
  const [allocationData, setAllocationData] = useState<AllocationData>({});
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const { data: categories = [], isLoading } = useCategories();

  useEffect(() => {
    const storedBudget = sessionStorage.getItem("setupBudget");
    const storedIncome = sessionStorage.getItem("setupIncome");
    const storedCategories = sessionStorage.getItem("setupCategories");
    const skippedCategories = sessionStorage.getItem("setupSkippedCategories");

    console.log("Debug - stored data:", {
      storedBudget,
      storedIncome,
      storedCategories,
      skippedCategories,
    });

    if (!storedBudget || !storedIncome || !storedCategories) {
      console.log("Debug - missing required data, redirecting to budget");
      router.push("/setup/budget");
      return;
    }

    // If categories were skipped, go directly to invite
    if (skippedCategories === "true") {
      console.log("Debug - categories skipped, redirecting to invite");
      router.push("/setup/invite");
      return;
    }

    try {
      const parsedBudget = JSON.parse(storedBudget) as BudgetData;
      const parsedIncome = JSON.parse(storedIncome) as IncomeData;
      const parsedCategories = JSON.parse(storedCategories) as string[];

      console.log("Debug - parsed data:", {
        parsedBudget,
        parsedIncome,
        parsedCategories,
      });

      // Ensure amount is a number
      parsedIncome.amount = Number(parsedIncome.amount);

      // Ensure frequency exists (for backward compatibility)
      if (!parsedIncome.frequency) {
        parsedIncome.frequency = "MONTHLY";
      }

      setBudgetData(parsedBudget);
      setIncomeData(parsedIncome);
      setSelectedCategoryIds(parsedCategories);
    } catch (error) {
      console.log("Debug - error parsing data:", error);
      router.push("/setup/budget");
    }
  }, [router]);

  useEffect(() => {
    if (selectedCategoryIds.length > 0 && incomeData) {
      const initialAllocation: AllocationData = {};
      const equalAmount = incomeData.amount / selectedCategoryIds.length;

      selectedCategoryIds.forEach((categoryId) => {
        initialAllocation[categoryId] = equalAmount;
      });

      setAllocationData(initialAllocation);
    }
  }, [selectedCategoryIds, incomeData]);

  const handleAllocationChange = (categoryId: string, value: number) => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedValue = Math.round(value * 100) / 100;
    setAllocationData((prev) => ({
      ...prev,
      [categoryId]: roundedValue,
    }));
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId);
  };

  const totalAllocated = Object.values(allocationData).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const remaining = (Number(incomeData?.amount) ?? 0) - totalAllocated;
  const isZeroSumValid =
    budgetData?.strategy === "ZERO_SUM" ? Math.abs(remaining) < 0.01 : true;

  const handleContinue = () => {
    if (!isZeroSumValid) {
      alert(
        "For zero-sum budgeting, your allocations must equal your income exactly",
      );
      return;
    }

    // Store allocation data in sessionStorage
    sessionStorage.setItem("setupAllocation", JSON.stringify(allocationData));

    // Navigate to next step
    router.push("/setup/invite");
  };

  const handleBack = () => {
    router.push("/setup/categories");
  };

  const getCategoryGroupColor = (group: string) => {
    switch (group) {
      case "NEEDS":
        return "bg-red-100 text-red-800 border-red-200";
      case "WANTS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "INVESTMENT":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!budgetData || !incomeData || isLoading) {
    console.log("Debug - loading condition:", {
      budgetData: !!budgetData,
      incomeData: !!incomeData,
      isLoading,
    });
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
          Allocate Your Income
        </h1>
        <p className="text-gray-600">
          {budgetData.strategy === "ZERO_SUM"
            ? "Distribute your income across your selected categories"
            : "Set spending limits for each category"}
        </p>
      </div>

      <SetupProgress currentStep="allocation" steps={setupSteps} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Total Income:
            </span>
            <span className="text-lg font-bold text-gray-900">
              ${Number(incomeData.amount).toFixed(2)}
            </span>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Total Allocated:
            </span>
            <span
              className={`text-lg font-bold ${totalAllocated > Number(incomeData.amount) ? "text-red-600" : "text-gray-900"}`}
            >
              ${totalAllocated.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Remaining:
            </span>
            <span
              className={`text-lg font-bold ${remaining < 0 ? "text-red-600" : remaining > 0 ? "text-green-600" : "text-gray-900"}`}
            >
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {selectedCategoryIds.map((categoryId) => {
            const category = getCategoryById(categoryId);
            if (!category) return null;

            return (
              <div
                key={categoryId}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Default: ${Number(category.spendingLimit).toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                      category.group,
                    )}`}
                  >
                    {category.group}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={allocationData[categoryId]?.toFixed(2) ?? "0.00"}
                    onChange={(e) =>
                      handleAllocationChange(
                        categoryId,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
                    placeholder="0.00"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!isZeroSumValid && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">
              For zero-sum budgeting, your allocations must equal your income
              exactly. Please adjust your allocations.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!isZeroSumValid}
            className="hover:bg-secondary/80 rounded-md bg-secondary px-6 py-2 text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
