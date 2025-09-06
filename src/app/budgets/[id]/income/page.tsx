"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  Target,
} from "lucide-react";
import { PeriodType } from "@prisma/client";
import { toast } from "react-hot-toast";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { calculateAdjustedIncome } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import IncomeModal from "@/components/budgets/IncomeModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

interface Income {
  id: string;
  amount: number;
  source: string | null;
  description: string | null;
  isPlanned: boolean;
  frequency: PeriodType;
  receivedAt: Date | null;
}

export default function IncomePage() {
  const router = useRouter();
  const params = useParams();
  const budgetId = params.id as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);

  const { data: budget, isLoading, refetch } = useBudget(budgetId);

  const incomes = useMemo(() => {
    return budget?.incomes ?? [];
  }, [budget]);

  // Filter incomes based on search query
  const filteredIncomes = useMemo(() => {
    if (!searchQuery.trim()) return incomes;

    const query = searchQuery.toLowerCase();
    return incomes.filter(
      (income) =>
        (income.source?.toLowerCase().includes(query) ?? false) ||
        (income.description?.toLowerCase().includes(query) ?? false) ||
        income.amount.toString().includes(query) ||
        income.frequency.toLowerCase().includes(query),
    );
  }, [incomes, searchQuery]);

  // Calculate total income
  const totalIncome = useMemo(() => {
    if (!budget) return 0;

    return incomes.reduce((sum, income) => {
      const adjustedAmount = calculateAdjustedIncome(
        income.amount,
        income.frequency,
        budget.period,
      );
      return sum + adjustedAmount;
    }, 0);
  }, [incomes, budget]);

  const handleDeleteIncome = async (income: Income) => {
    setIncomeToDelete(income);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteIncome = async () => {
    if (!incomeToDelete) return;

    try {
      const response = await fetch(
        `/api/budgets/${budgetId}/income/${incomeToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete income");
      }

      toast.success("Income deleted successfully!");
      void refetch();
    } catch {
      toast.error("Failed to delete income");
    } finally {
      setIsDeleteModalOpen(false);
      setIncomeToDelete(null);
    }
  };

  const getFrequencyLabel = (frequency: PeriodType) => {
    switch (frequency) {
      case PeriodType.WEEKLY:
        return "Weekly";
      case PeriodType.MONTHLY:
        return "Monthly";
      case PeriodType.QUARTERLY:
        return "Quarterly";
      case PeriodType.YEARLY:
        return "Yearly";
      case PeriodType.ONE_TIME:
        return "One-time";
      default:
        return frequency;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading income data..." />;
  }

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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={`${budget?.name ?? "Budget"} - Income Sources`}
        description="Manage income sources for this budget"
        action={{
          label: "Add Income Source",
          onClick: () => setIsIncomeModalOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
        backButton={{
          onClick: () => {
            // Use a more reliable navigation method for mobile
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to programmatic navigation if no history
              router.push("/budgets");
            }
          },
        }}
      />

      <div className="flex-1 overflow-hidden pt-16 sm:pt-20 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search income sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-10 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Total Income Summary */}
              <div className="rounded-xl border-0 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 p-6 shadow-lg sm:p-8">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                  <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm sm:p-4">
                    <DollarSign className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white/90 sm:text-xl">
                      Total Income
                    </h3>
                    <p className="text-2xl font-bold text-white sm:text-4xl">
                      {formatCurrency(totalIncome)}
                    </p>
                    <p className="text-sm text-white/80 sm:text-base">
                      Adjusted for {budget.period.toLowerCase()} budget period
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm sm:block">
                    <span className="text-sm font-medium text-white">
                      {budget.period.charAt(0).toUpperCase() +
                        budget.period.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income List */}
            <div className="mt-4 rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Income Sources ({filteredIncomes.length})
                </h3>
              </div>

              {filteredIncomes.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No income sources
                  </h3>
                  <p className="mt-2 text-gray-500">
                    {searchQuery
                      ? "No income sources match your search."
                      : "Get started by adding your first income source."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsIncomeModalOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Income Source
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIncomes.map((income) => {
                    const adjustedAmount = calculateAdjustedIncome(
                      income.amount,
                      income.frequency,
                      budget.period,
                    );

                    return (
                      <div
                        key={income.id}
                        className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md sm:p-6"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-gray-900 sm:text-lg">
                                  {income.source ?? "Unnamed Source"}
                                </h4>
                                {income.isPlanned && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                    Planned
                                  </span>
                                )}
                              </div>

                              {/* Action Icons - Top right on mobile, right side on desktop */}
                              <div className="flex items-center space-x-2 opacity-100 transition-opacity sm:hidden">
                                <button
                                  onClick={() => setIsIncomeModalOpen(true)}
                                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                  title="Edit income source"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIncome(income)}
                                  className="rounded-lg p-2 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                                  title="Delete income source"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {income.description && (
                              <p className="mb-3 text-sm text-gray-600 sm:text-base">
                                {income.description}
                              </p>
                            )}

                            <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-6">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(income.amount)}
                                </span>
                                <span>
                                  /{" "}
                                  {getFrequencyLabel(
                                    income.frequency,
                                  ).toLowerCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Adjusted: {formatCurrency(adjustedAmount)}
                                </span>
                              </div>

                              {income.receivedAt && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {new Date(
                                      income.receivedAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Icons - Desktop only, hidden on mobile */}
                          <div className="hidden items-center justify-end space-x-2 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                            <button
                              onClick={() => setIsIncomeModalOpen(true)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                              title="Edit income source"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(income)}
                              className="rounded p-1 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                              title="Delete income source"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Income Modal */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        budgetId={budgetId}
        incomes={incomes}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={() => {
          void refetch();
          setIsIncomeModalOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Income Source"
        message={`Are you sure you want to delete "${incomeToDelete?.source}"? This action cannot be undone.`}
        onConfirm={confirmDeleteIncome}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIncomeToDelete(null);
        }}
        itemName={incomeToDelete?.source ?? "this income source"}
      />
    </div>
  );
}
