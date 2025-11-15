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
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading pockets</div>
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
          <div className="mb-4 text-gray-400">
            <PiggyBank className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Savings account not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
        {/* Pockets Section */}
        <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
              Pockets
            </h3>
            <Button onClick={() => setIsAddingPocket(true)}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Add Pocket</span>
            </Button>
          </div>

          <div className="space-y-4">
            {/* Pockets Grid */}
            {savings.pockets && savings.pockets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savings.pockets.map((pocket) => (
                  <PocketCard
                    key={pocket.id}
                    pocket={pocket}
                    savingsId={savingsId}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                <div className="text-center text-sm text-gray-500">
                  <p>No pockets yet</p>
                  <p>Click &quot;Add Pocket&quot; to create one</p>
                </div>
              </div>
            )}
          </div>
        </div>
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
