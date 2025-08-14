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
          onClick: () => router.back(),
        }}
      />

      <div className="flex-1 overflow-hidden pt-4 sm:pt-20 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
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
              <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">
                      Total Income
                    </h3>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(totalIncome)}
                    </p>
                    <p className="text-sm text-green-600">
                      Adjusted for {budget.period.toLowerCase()} budget period
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income List */}
            <div className="mt-4 rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
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
                        className="group rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {income.source ?? "Unnamed Source"}
                              </h4>
                              {income.isPlanned && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                  Planned
                                </span>
                              )}
                            </div>

                            {income.description && (
                              <p className="mb-3 text-gray-600">
                                {income.description}
                              </p>
                            )}

                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(income.amount)}
                                </span>
                                <span>
                                  per{" "}
                                  {getFrequencyLabel(
                                    income.frequency,
                                  ).toLowerCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Adjusted: {formatCurrency(adjustedAmount)}
                                </span>
                              </div>

                              {income.receivedAt && (
                                <div className="flex items-center gap-1">
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

                          {/* Action Icons - Always visible on mobile, hover on desktop */}
                          <div className="flex items-center space-x-1 opacity-100 transition-opacity sm:space-x-2 sm:opacity-0 sm:group-hover:opacity-100">
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
