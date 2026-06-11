"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useSavings } from "@/lib/data-hooks/savings/useSavings";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PiggyBank, Plus } from "lucide-react";
import CreateSavingsModal from "@/components/savings/CreateSavingsModal";
import Button from "@/components/Button";
import { formatCurrency } from "@/lib/utils";

export default function SavingsPage() {
  const { data: savings = [], isLoading, error } = useSavings();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreate = () => setIsCreateModalOpen(true);

  if (isLoading) return <LoadingSpinner message="Loading savings..." />;
  if (error)
    return <div className="p-6 text-red-600">Failed to load savings</div>;

  return (
    <div className="flex h-screen flex-col bg-surface pt-16 sm:pt-8 lg:pt-0">
      <PageHeader
        title="Savings"
        description="Track savings accounts and categories"
        action={{
          label: "Add savings account",
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />,
        }}
      />
      <CreateSavingsModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {savings.map((acc) => (
              <Link
                key={acc.id}
                href={`/savings/${acc.id}`}
                className="card-interactive block p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-muted text-secondary-600">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-gray-900">
                    {acc.name}
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium tabular-nums text-secondary-700">
                    {acc.pockets.length}{" "}
                    {acc.pockets.length === 1 ? "pocket" : "pockets"}
                  </span>
                  <span className="text-lg font-bold tabular-nums tracking-tight text-gray-900">
                    {formatCurrency(acc.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {savings.length === 0 && (
            <div className="card-surface flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No savings accounts yet
              </h3>
              <p className="text-sm text-gray-500">
                Create your first savings account to start tracking your goals
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                <span>Add savings account</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
