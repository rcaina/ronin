"use client";

import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import BudgetCategoriesGridView from "@/components/budgets/BudgetCategoriesGridView";
import BudgetCategoriesViewToggle, {
  type BudgetCategoriesViewType,
} from "@/components/budgets/BudgetCategoriesViewToggle";
import BudgetCategoriesListView from "@/components/budgets/BudgetCategoriesListView";
import BudgetCategoriesSearch from "@/components/budgets/BudgetCategoriesSearch";
import { CategoryType } from "@prisma/client";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useBudgetCategories } from "@/lib/data-hooks/budgets/useBudgetCategories";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import {
  Target,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  DollarSign,
} from "lucide-react";

const BudgetCategoriesPage = () => {
  const { id } = useParams();
  const budgetId = id as string;
  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(budgetId);
  const [view, setView] = useState<BudgetCategoriesViewType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Use the search query in the hook
  const {
    data: budgetCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBudgetCategories(budgetId, searchQuery);

  // Calculate allocation statistics
  const totalIncome =
    budget?.incomes?.reduce((sum, income) => sum + income.amount, 0) ?? 0;
  const totalAllocated =
    budget?.categories?.reduce((sum, cat) => sum + cat.allocatedAmount, 0) ?? 0;
  const allocationDifference = totalIncome - totalAllocated;

  // Calculate category statistics
  const totalCategories = budget?.categories?.length ?? 0;
  const completedCategories =
    budget?.categories?.filter((cat) => {
      const totalSpent =
        cat.transactions?.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        ) ?? 0;
      return totalSpent >= cat.allocatedAmount;
    }).length ?? 0;

  // Calculate categories over budget and total amount over
  const categoriesOverBudget =
    budget?.categories?.filter((cat) => {
      const totalSpent =
        cat.transactions?.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        ) ?? 0;
      return totalSpent > cat.allocatedAmount;
    }).length ?? 0;

  const totalOverBudget =
    budget?.categories?.reduce((sum, cat) => {
      const totalSpent =
        cat.transactions?.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        ) ?? 0;
      const overAmount = Math.max(0, totalSpent - cat.allocatedAmount);
      return sum + overAmount;
    }, 0) ?? 0;

  // Determine allocation status
  const getAllocationStatus = () => {
    // Add a small tolerance for floating point precision issues
    const tolerance = 0.01; // $0.01 tolerance

    if (Math.abs(allocationDifference) <= tolerance) {
      return {
        value: "100%",
        subtitle: "allocated",
        icon: <CheckCircle className="h-4 w-4" />,
        iconColor: "text-green-500",
        valueColor: "text-green-600",
      };
    } else if (allocationDifference > tolerance) {
      return {
        value: `$${allocationDifference.toFixed(2)}`,
        subtitle: "left to allocate",
        icon: <TrendingUp className="h-4 w-4" />,
        iconColor: "text-blue-500",
        valueColor: "text-blue-600",
      };
    } else {
      // When over allocated, show the percentage over 100%
      const overAllocationPercentage = (
        (totalAllocated / totalIncome) *
        100
      ).toFixed(1);
      return {
        value: `${overAllocationPercentage}%`,
        subtitle: "over allocated",
        icon: <TrendingDown className="h-4 w-4" />,
        iconColor: "text-red-500",
        valueColor: "text-red-600",
      };
    }
  };

  const allocationStatus = getAllocationStatus();

  // Show loading state while either budget or categories are loading
  if (budgetLoading || categoriesLoading) {
    return <LoadingSpinner message="Loading budget categories..." />;
  }

  // Show error state if there's an error with budget or categories
  if (budgetError || categoriesError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading budget categories
          </div>
          <div className="text-sm text-gray-500">
            {budgetError?.message ??
              categoriesError?.message ??
              "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  // Show not found state if budget doesn't exist
  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <Target className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Budget not found</div>
        </div>
      </div>
    );
  }

  const getGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-blue-500";
      case CategoryType.WANTS:
        return "bg-purple-500";
      case CategoryType.INVESTMENT:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGroupLabel = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "Needs";
      case CategoryType.WANTS:
        return "Wants";
      case CategoryType.INVESTMENT:
        return "Investment";
      default:
        return group;
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="mobile-overflow-hidden flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={`${budget?.name ?? "Budget"} - Categories`}
        description="Manage your budget categories"
        backButton={{
          onClick: () => router.back(),
        }}
      />

      <div className="flex-1 pb-24 pt-4 sm:pt-20 lg:pt-0">
        <div className="mobile-overflow-y-auto h-full">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            {/* Stats Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <StatsCard
                title="Allocation Status"
                value={allocationStatus.value}
                subtitle={allocationStatus.subtitle}
                icon={allocationStatus.icon}
                iconColor={allocationStatus.iconColor}
                valueColor={allocationStatus.valueColor}
              />
              <StatsCard
                title="Completed Categories"
                value={completedCategories}
                subtitle={`of ${totalCategories} total`}
                icon={<CheckCircle className="h-4 w-4" />}
                iconColor="text-green-500"
                valueColor="text-green-600"
              />
              <StatsCard
                title="Categories Over Budget"
                value={categoriesOverBudget}
                subtitle={
                  categoriesOverBudget > 0
                    ? `$${totalOverBudget.toFixed(2)} over`
                    : "All within budget"
                }
                icon={
                  categoriesOverBudget > 0 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )
                }
                iconColor={
                  categoriesOverBudget > 0 ? "text-red-500" : "text-green-500"
                }
                valueColor={
                  categoriesOverBudget > 0 ? "text-red-600" : "text-green-600"
                }
              />
              <StatsCard
                title="Total Income"
                value={`$${totalIncome.toLocaleString()}`}
                subtitle="Available to allocate"
                icon={<DollarSign className="h-4 w-4" />}
                iconColor="text-green-500"
                valueColor="text-green-600"
              />
            </div>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <BudgetCategoriesSearch
                  onSearchChange={handleSearchChange}
                  searchQuery={searchQuery}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                <BudgetCategoriesViewToggle
                  view={view}
                  onViewChange={setView}
                />
              </div>
            </div>

            {view === "grid" ? (
              <BudgetCategoriesGridView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
                budgetCategories={budgetCategories}
              />
            ) : (
              <BudgetCategoriesListView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
                budgetCategories={budgetCategories}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCategoriesPage;
