"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  usePocket,
  useCreateAllocation,
  useUpdateAllocation,
} from "@/lib/data-hooks/savings/usePocket";
import { useDeleteAllocation } from "@/lib/data-hooks/savings/usePockets";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import {
  AlertCircle,
  PiggyBank,
  Target,
  DollarSign,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { roundToCents, formatCurrency, formatDateUTC } from "@/lib/utils";
import { toast } from "react-hot-toast";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddAllocationModal from "@/components/savings/AddAllocationModal";
import type { AllocationSummary } from "@/lib/types/savings";
import type {
  CreateAllocationSchema,
  UpdateAllocationSchema,
} from "@/lib/api-schemas/savings";
import Button from "@/components/Button";
import { usePocketHeader } from "@/components/savings/PocketHeaderContext";

const PocketDetailPage = () => {
  const params = useParams();
  const pocketId = params.pocketId as string;
  const { setAction } = usePocketHeader();

  const {
    data: pocket,
    isLoading: pocketLoading,
    error: pocketError,
  } = usePocket(pocketId);

  const createAllocationMutation = useCreateAllocation();
  const updateAllocationMutation = useUpdateAllocation();
  const deleteAllocationMutation = useDeleteAllocation();

  const [isAddingAllocation, setIsAddingAllocation] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(
    null,
  );
  const [allocationToDelete, setAllocationToDelete] = useState<string | null>(
    null,
  );

  const [editingAmount, setEditingAmount] = useState<string>("");
  const [editingNote, setEditingNote] = useState<string>("");
  const [editingOccurredAt, setEditingOccurredAt] = useState<string>("");

  // Calculate statistics
  const totalAllocated =
    typeof pocket?.total === "number" && !isNaN(pocket.total)
      ? pocket.total
      : 0;
  const goalAmount =
    typeof pocket?.goalAmount === "number" && !isNaN(pocket.goalAmount)
      ? pocket.goalAmount
      : 0;
  const goalProgress = goalAmount > 0 ? (totalAllocated / goalAmount) * 100 : 0;
  const goalProgressPercentage = roundToCents(Math.min(goalProgress, 100));
  const totalAllocations = pocket?.allocations?.length ?? 0;

  // Set the header action button
  useEffect(() => {
    setAction({
      label: "Add Allocation",
      onClick: () => setIsAddingAllocation(true),
      icon: <Plus className="h-3 w-3 sm:h-4 sm:w-4" />,
    });

    // Cleanup: remove action when component unmounts
    return () => setAction(null);
  }, [setAction]);

  const handleAddAllocation = async (data: CreateAllocationSchema) => {
    try {
      await createAllocationMutation.mutateAsync(data);
      setIsAddingAllocation(false);
      toast.success("Allocation added successfully!");
    } catch (error) {
      console.error("Failed to add allocation:", error);
      toast.error("Failed to add allocation. Please try again.");
    }
  };

  const handleStartEditAllocation = (allocation: AllocationSummary) => {
    setEditingAllocationId(allocation.id);
    setEditingAmount(allocation.amount.toString());
    setEditingNote(allocation.note ?? "");
    if (allocation.occurredAt) {
      const occurredAtStr = String(allocation.occurredAt);
      try {
        const dateStr = new Date(occurredAtStr).toISOString().split("T")[0];
        setEditingOccurredAt(dateStr ?? "");
      } catch {
        setEditingOccurredAt("");
      }
    } else {
      setEditingOccurredAt("");
    }
  };

  const handleCancelEditAllocation = () => {
    setEditingAllocationId(null);
    setEditingAmount("");
    setEditingNote("");
    setEditingOccurredAt("");
  };

  const handleSaveAllocation = async (allocation: AllocationSummary) => {
    const amount = parseFloat(editingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      const data: UpdateAllocationSchema = {
        amount: amount,
        withdrawal: allocation.withdrawal, // Preserve the withdrawal flag
      };

      // Include note if it's been modified (even if empty)
      if (editingNote.trim() !== (allocation.note ?? "")) {
        data.note = editingNote.trim() || undefined;
      }

      // Include occurredAt if it's been modified
      let currentOccurredAt = "";
      if (allocation.occurredAt) {
        const occurredAtStr = String(allocation.occurredAt);
        try {
          const dateStr = new Date(occurredAtStr).toISOString().split("T")[0];
          currentOccurredAt = dateStr ?? "";
        } catch {
          currentOccurredAt = "";
        }
      }
      if (editingOccurredAt !== currentOccurredAt) {
        data.occurredAt = editingOccurredAt.trim() || undefined;
      }

      await updateAllocationMutation.mutateAsync({
        allocationId: allocation.id,
        data,
      });
      setEditingAllocationId(null);
      setEditingAmount("");
      setEditingNote("");
      setEditingOccurredAt("");
      toast.success("Allocation updated successfully!");
    } catch (error) {
      console.error("Failed to update allocation:", error);
      toast.error("Failed to update allocation. Please try again.");
    }
  };

  const handleDeleteAllocation = (allocationId: string) => {
    setAllocationToDelete(allocationId);
  };

  const handleConfirmDeleteAllocation = async () => {
    if (!allocationToDelete) return;

    try {
      await deleteAllocationMutation.mutateAsync(allocationToDelete);
      setAllocationToDelete(null);
      toast.success("Allocation removed successfully!");
    } catch (error) {
      console.error("Failed to delete allocation:", error);
      toast.error("Failed to delete allocation. Please try again.");
    }
  };

  const handleCancelDeleteAllocation = () => {
    setAllocationToDelete(null);
  };

  // Show loading state
  if (pocketLoading) {
    return <LoadingSpinner message="Loading pocket..." />;
  }

  // Show error state
  if (pocketError) {
    const errorMessage =
      pocketError && typeof pocketError === "object" && "message" in pocketError
        ? String(pocketError.message)
        : "An unexpected error occurred";
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading pocket</div>
          <div className="text-sm text-gray-500">{errorMessage}</div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!pocket) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <PiggyBank className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Pocket not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto w-full flex-shrink-0 px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <StatsCard
            title="Total Saved"
            value={formatCurrency(totalAllocated)}
            subtitle="Current balance"
            icon={
              <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
            }
            iconColor="text-green-500"
            valueColor="text-green-600"
          />

          <StatsCard
            title="Total Allocations"
            value={totalAllocations}
            subtitle="Allocations made"
            icon={<PiggyBank className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />}
            iconColor="text-blue-500"
            valueColor="text-blue-600"
          />

          {goalAmount > 0 && (
            <>
              <StatsCard
                title="Goal Progress"
                value={`${goalProgressPercentage.toFixed(0)}%`}
                subtitle={`${formatCurrency(totalAllocated)} / ${formatCurrency(goalAmount)}`}
                icon={
                  <Target className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-purple-500"
                valueColor={
                  goalProgressPercentage >= 100
                    ? "text-green-600"
                    : "text-purple-600"
                }
              />

              <StatsCard
                title="Goal Amount"
                value={formatCurrency(goalAmount)}
                subtitle="Target amount"
                icon={
                  <Target className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-gray-500"
              />
            </>
          )}
        </div>

        {/* Progress Bar */}
        {goalAmount > 0 && (
          <div className="mb-6 rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="mb-2 flex items-center justify-between sm:mb-4">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                Goal Progress
              </h3>
              <span className="text-xs text-gray-500 sm:text-sm">
                {goalProgressPercentage.toFixed(1)}% complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 sm:h-3">
              <div
                className={`h-2 rounded-full transition-all duration-300 sm:h-3 ${
                  goalProgressPercentage >= 100
                    ? "bg-green-500"
                    : "bg-secondary"
                }`}
                style={{ width: `${goalProgressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Allocations Section - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-2 pb-20 sm:px-4 sm:pb-24 lg:px-8 lg:pb-32">
          <div className="rounded-xl border bg-white p-3 pb-8 shadow-sm sm:p-6 sm:pb-12">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                Allocations
              </h3>
            </div>

            {/* Allocations List */}
            <div className="space-y-2 pb-4">
              {pocket.allocations && pocket.allocations.length > 0 ? (
                pocket.allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      editingAllocationId === allocation.id
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {editingAllocationId === allocation.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">
                              {allocation.occurredAt
                                ? formatDateUTC(String(allocation.occurredAt))
                                : formatDateUTC(allocation.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Note
                          </label>
                          <textarea
                            value={editingNote}
                            onChange={(e) => setEditingNote(e.target.value)}
                            placeholder="Add a note about this allocation..."
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Amount"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              Occurred At (optional)
                            </label>
                            <input
                              type="date"
                              value={editingOccurredAt}
                              onChange={(e) =>
                                setEditingOccurredAt(e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={handleCancelEditAllocation}
                            disabled={updateAllocationMutation.isPending}
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSaveAllocation(allocation)}
                            disabled={updateAllocationMutation.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {allocation.note ?? "Allocation"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {allocation.occurredAt
                              ? formatDateUTC(String(allocation.occurredAt))
                              : formatDateUTC(allocation.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              allocation.withdrawal
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatCurrency(allocation.amount)}
                          </span>
                          <button
                            onClick={() =>
                              handleStartEditAllocation(allocation)
                            }
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title="Edit allocation"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAllocation(allocation.id)
                            }
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                            title="Remove allocation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center text-sm text-gray-500">
                    <p>No allocations yet</p>
                    <p>Click &quot;Add Allocation&quot; to create one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Allocation Modal */}
      <AddAllocationModal
        isOpen={isAddingAllocation}
        onClose={() => setIsAddingAllocation(false)}
        onSubmit={handleAddAllocation}
        isLoading={createAllocationMutation.isPending}
        pocketId={pocketId}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!allocationToDelete}
        onClose={handleCancelDeleteAllocation}
        onConfirm={handleConfirmDeleteAllocation}
        title="Remove Allocation"
        message="Are you sure you want to remove this allocation? This action cannot be undone."
        itemName="Allocation"
        isLoading={deleteAllocationMutation.isPending}
        confirmText="Remove Allocation"
      />
    </div>
  );
};

export default PocketDetailPage;
