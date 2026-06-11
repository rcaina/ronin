"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { useCreatePocket } from "@/lib/data-hooks/savings/usePockets";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AlertCircle, PiggyBank, Plus } from "lucide-react";
import PocketCard from "@/components/savings/PocketCard";
import AddPocketModal from "@/components/savings/AddPocketModal";
import { toast } from "react-hot-toast";
import type { CreatePocketSchema } from "@/lib/api-schemas/savings";
import Button from "@/components/Button";

const PocketsPage = () => {
  const { id } = useParams();
  const savingsId = id as string;
  const {
    data: savings,
    isLoading: savingsLoading,
    error: savingsError,
    refetch,
  } = useSavingsAccount(savingsId);
  const [isAddingPocket, setIsAddingPocket] = useState(false);
  const createPocketMutation = useCreatePocket();

  const handleSubmitAddPocket = async (data: CreatePocketSchema) => {
    try {
      await createPocketMutation.mutateAsync(data);
      setIsAddingPocket(false);
      toast.success("Pocket added successfully!");
      void refetch();
    } catch (error) {
      console.error("Failed to add pocket:", error);
      toast.error("Failed to add pocket. Please try again.");
    }
  };

  // Show loading state
  if (savingsLoading) {
    return <LoadingSpinner message="Loading pockets..." />;
  }

  // Show error state
  if (savingsError) {
    const errorMessage =
      savingsError &&
      typeof savingsError === "object" &&
      "message" in savingsError
        ? String(savingsError.message)
        : "An unexpected error occurred";
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="mb-2 text-lg font-semibold text-gray-900">
            Error loading pockets
          </div>
          <div className="text-sm text-gray-500">{errorMessage}</div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!savings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Savings account not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
        {/* Pockets Section */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
            Pockets
          </h3>
          <Button onClick={() => setIsAddingPocket(true)}>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Add pocket</span>
          </Button>
        </div>

        {/* Pockets Grid */}
        {savings.pockets && savings.pockets.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {savings.pockets.map((pocket) => (
              <PocketCard
                key={pocket.id}
                pocket={pocket}
                savingsId={savingsId}
              />
            ))}
          </div>
        ) : (
          <div className="card-surface flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
              <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No pockets yet
            </h3>
            <p className="text-sm text-gray-500">
              Pockets help you organize savings toward specific goals
            </p>
            <Button onClick={() => setIsAddingPocket(true)}>
              <Plus className="h-4 w-4" />
              <span>Add pocket</span>
            </Button>
          </div>
        )}
      </div>

      {/* Add Pocket Modal */}
      <AddPocketModal
        isOpen={isAddingPocket}
        onClose={() => setIsAddingPocket(false)}
        onSubmit={handleSubmitAddPocket}
        isLoading={createPocketMutation.isPending}
        savingsId={savingsId}
      />
    </div>
  );
};

export default PocketsPage;
