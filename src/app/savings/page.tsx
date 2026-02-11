"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useSavings } from "@/lib/data-hooks/savings/useSavings";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Plus } from "lucide-react";
import CreateSavingsModal from "@/components/savings/CreateSavingsModal";
import { formatCurrency } from "@/lib/utils";

export default function SavingsPage() {
  const { data: savings = [], isLoading, error } = useSavings();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreate = () => setIsCreateModalOpen(true);

  if (isLoading) return <LoadingSpinner message="Loading savings..." />;
  if (error)
    return <div className="p-6 text-red-600">Failed to load savings</div>;

  return (
    <div className="flex h-screen flex-col bg-gray-50 pt-16 sm:pt-8 lg:pt-0">
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
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savings.map((acc) => (
              <Link
                key={acc.id}
                href={`/savings/${acc.id}`}
                className="block rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="text-base font-semibold text-gray-900">
                  {acc.name}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-sm text-gray-500">
                    {acc.pockets.length}{" "}
                    {acc.pockets.length === 1 ? "pocket" : "pockets"}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(acc.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {savings.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              No savings accounts yet. Create your first one above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
