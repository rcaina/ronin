"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import SetupProgress from "@/components/SetupProgress";
import type { CategoryType } from "@prisma/client";
import type { GroupedCategories } from "@/lib/data-hooks/services/categories";

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

// Type for the category objects returned by the API
type CategoryItem = {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
};

const setupSteps = [
  { id: "budget", title: "Budget", description: "Basic details" },
  { id: "income", title: "Income", description: "Set your income" },
  { id: "categories", title: "Categories", description: "Choose categories" },
  { id: "allocation", title: "Allocation", description: "Allocate funds" },
  { id: "invite", title: "Invite", description: "Invite others" },
];

export default function CategoriesSetupPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const { data: categories, isLoading } = useCategories();

  useEffect(() => {
    const storedBudget = sessionStorage.getItem("setupBudget");
    const storedIncome = sessionStorage.getItem("setupIncome");

    if (!storedBudget || !storedIncome) {
      router.push("/setup/budget");
      return;
    }

    try {
      setBudgetData(JSON.parse(storedBudget) as BudgetData);
      setIncomeData(JSON.parse(storedIncome) as IncomeData);
    } catch {
      router.push("/setup/budget");
    }
  }, [router]);

  // Set all categories as selected by default when categories load
  useEffect(() => {
    if (
      categories &&
      Object.values(categories).flat().length > 0 &&
      selectedCategories.length === 0
    ) {
      const allCategories = Object.values(categories).flat() as CategoryItem[];
      setSelectedCategories(allCategories.map((category) => category.id));
    }
  }, [categories, selectedCategories.length]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleContinue = () => {
    // Store selected categories in sessionStorage
    sessionStorage.setItem(
      "setupCategories",
      JSON.stringify(selectedCategories),
    );

    // Navigate to next step
    router.push("/setup/allocation");
  };

  const handleSkip = () => {
    console.log("Debug - Skip button clicked");

    // Store empty array to indicate no categories selected
    sessionStorage.setItem("setupCategories", JSON.stringify([]));
    // Store empty allocation object for skipped categories
    sessionStorage.setItem("setupAllocation", JSON.stringify({}));
    // Store a flag indicating categories and allocation were skipped
    sessionStorage.setItem("setupSkippedCategories", "true");

    console.log("Debug - SessionStorage updated:", {
      categories: sessionStorage.getItem("setupCategories"),
      allocation: sessionStorage.getItem("setupAllocation"),
      skipped: sessionStorage.getItem("setupSkippedCategories"),
    });

    // Skip to invite step (skip allocation as well)
    console.log("Debug - Redirecting to invite page");
    router.push("/setup/invite");

    // Fallback navigation in case router fails
    setTimeout(() => {
      console.log("Debug - Fallback navigation");
      window.location.replace("/setup/invite");
    }, 100);
  };

  const handleBack = () => {
    router.push("/setup/income");
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

  if (!budgetData || !incomeData || isLoading || !categories) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const allCategories = Object.values(categories).flat() as CategoryItem[];
  const totalCategories = allCategories.length;

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
          Choose Your Categories
        </h1>
        <p className="text-gray-600">
          Select the spending categories you want to track in your budget
        </p>
      </div>

      <SetupProgress currentStep="categories" steps={setupSteps} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Note about defaults */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Default Categories:</strong> We&apos;ve selected all
                categories by default to get you started quickly. You can
                unselect any you don&apos;t need, and add, edit, or remove
                categories later from your budget settings.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-4 text-sm text-gray-600">
            Selected {selectedCategories.length} of {totalCategories} categories
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(categories).map(([group, groupCategories]) => (
            <div key={group}>
              <h3 className="mb-3 text-lg font-semibold capitalize text-gray-900">
                {group.toLowerCase()}
              </h3>
              <div className="grid gap-3">
                {(groupCategories as CategoryItem[]).map((category) => (
                  <div
                    key={category.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                      selectedCategories.includes(category.id)
                        ? "bg-secondary/5 border-secondary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {category.name}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                        category.group,
                      )}`}
                    >
                      {category.group}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            Back
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              onMouseDown={() => console.log("Debug - Skip button mouse down")}
              className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="hover:bg-secondary/80 rounded-md bg-secondary px-6 py-2 text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
