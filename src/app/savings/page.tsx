"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useSavings } from "@/lib/data-hooks/savings/useSavings";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Plus } from "lucide-react";
import CreateSavingsModal from "@/components/savings/CreateSavingsModal";

export default function SavingsPage() {
  const { data: savings = [], isLoading, error } = useSavings();
  const { data: budgets = [] } = useBudgets();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const handleOpenCreate = () => setIsCreateModalOpen(true);

  if (isLoading) return <LoadingSpinner message="Loading savings..." />;
  if (error)
    return <div className="p-6 text-red-600">Failed to load savings</div>;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Savings"
        description="Track savings accounts and categories"
        action={{
          label: "Add Savings Account",
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />,
        }}
      />
      <CreateSavingsModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <div className="flex-1 overflow-hidden pt-4 sm:pt-20 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
            <div className="space-y-4">
              {savings.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {acc.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {acc.budget ? acc.budget.name : "No budget link"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(acc.total)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {acc.pockets.map((cat) => (
                      <div
                        key={cat.id}
                        className="rounded-lg border bg-gray-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-900">
                            {cat.name}
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            {formatCurrency(cat.total)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {acc.pockets.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No categories yet
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {savings.length === 0 && (
                <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
                  No savings accounts yet. Create your first one above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
