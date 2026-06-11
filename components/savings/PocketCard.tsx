"use client";

import { Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useParams } from "next/navigation";
import {
  useUpdatePocket,
  useDeletePocket,
  useDeleteAllocation,
} from "@/lib/data-hooks/savings/usePockets";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import type { PocketSummary } from "@/lib/types/savings";
import { roundToCents, formatDateUTC } from "@/lib/utils";

interface PocketCardProps {
  pocket: PocketSummary;
  savingsId?: string;
}

export default function PocketCard({ pocket, savingsId }: PocketCardProps) {
  const params = useParams();
  const currentSavingsId = savingsId ?? (params.id as string);
  const [editingPocketId, setEditingPocketId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [editingGoalAmount, setEditingGoalAmount] = useState<string | number>(
    0,
  );
  const [pocketToDelete, setPocketToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [allocationToDelete, setAllocationToDelete] = useState<string | null>(
    null,
  );

  const updatePocketMutation = useUpdatePocket();
  const deletePocketMutation = useDeletePocket();
  const deleteAllocationMutation = useDeleteAllocation();

  const pocketDetailUrl = `/savings/${currentSavingsId}/pockets/${pocket.id}`;

  const totalAllocated =
    typeof pocket.total === "number" && !isNaN(pocket.total) ? pocket.total : 0;
  const goalAmount =
    typeof pocket.goalAmount === "number" && !isNaN(pocket.goalAmount)
      ? pocket.goalAmount
      : 0;
  const goalProgress = goalAmount > 0 ? (totalAllocated / goalAmount) * 100 : 0;
  const goalProgressPercentage = roundToCents(Math.min(goalProgress, 100));

  const handleStartEditPocket = () => {
    setEditingPocketId(pocket.id);
    setEditingName(pocket.name);
    setEditingGoalAmount(pocket.goalAmount ?? 0);
  };

  const handleCancelEditPocket = () => {
    setEditingPocketId(null);
    setEditingName("");
    setEditingGoalAmount(0);
  };

  const handleSavePocket = async () => {
    if (!editingPocketId) return;

    const goalAmountValue =
      typeof editingGoalAmount === "string"
        ? parseFloat(editingGoalAmount) || null
        : editingGoalAmount || null;

    try {
      await updatePocketMutation.mutateAsync({
        pocketId: editingPocketId,
        data: {
          name: editingName,
          goalAmount: goalAmountValue,
        },
      });

      setEditingPocketId(null);
      setEditingName("");
      setEditingGoalAmount(0);
      toast.success("Pocket updated successfully!");
    } catch (error) {
      console.error("Failed to update pocket:", error);
      toast.error("Failed to update pocket. Please try again.");
    }
  };

  const handleDeletePocket = () => {
    setPocketToDelete({
      id: pocket.id,
      name: pocket.name,
    });
  };

  const handleConfirmDeletePocket = async () => {
    if (!pocketToDelete) return;

    try {
      await deletePocketMutation.mutateAsync(pocketToDelete.id);
      setPocketToDelete(null);
      toast.success("Pocket deleted successfully!");
    } catch (error) {
      console.error("Failed to delete pocket:", error);
      toast.error("Failed to delete pocket. Please try again.");
    }
  };

  const handleCancelDeletePocket = () => {
    setPocketToDelete(null);
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on edit/delete buttons or inputs
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      editingPocketId === pocket.id
    ) {
      return;
    }
    window.location.href = pocketDetailUrl;
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group relative overflow-hidden p-5 sm:p-6 ${
          editingPocketId === pocket.id
            ? "rounded-2xl border border-secondary-200 bg-secondary-50 shadow-card"
            : "card-interactive cursor-pointer"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          {editingPocketId === pocket.id ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-lg font-semibold tracking-tight text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                placeholder="Pocket name"
              />
            </div>
          ) : (
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              {pocket.name}
            </h3>
          )}
          <div className="flex items-center space-x-2">
            {editingPocketId !== pocket.id ? (
              <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditPocket();
                  }}
                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit pocket"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePocket();
                  }}
                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  title="Delete pocket"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSavePocket();
                  }}
                  disabled={updatePocketMutation.isPending}
                  className="rounded-lg p-2 text-green-600 transition-colors duration-200 hover:bg-green-50 disabled:opacity-50"
                  title="Save changes"
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEditPocket();
                  }}
                  disabled={updatePocketMutation.isPending}
                  className="rounded-lg p-2 text-gray-600 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50"
                  title="Cancel editing"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-xs font-medium text-gray-500">
                Total saved
              </span>
              <span className="font-medium tabular-nums text-gray-900">
                ${totalAllocated.toFixed(2).toLocaleString()}
              </span>
            </div>
            {(goalAmount > 0 || editingPocketId === pocket.id) && (
              <>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-xs font-medium text-gray-500">
                    Goal amount
                  </span>
                  {editingPocketId === pocket.id ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="text"
                        value={
                          typeof editingGoalAmount === "number"
                            ? editingGoalAmount === 0
                              ? ""
                              : String(editingGoalAmount)
                            : editingGoalAmount
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setEditingGoalAmount(value);
                          }
                        }}
                        className="w-20 rounded-xl border border-gray-300 px-2 py-0.5 text-right text-sm tabular-nums focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                  ) : (
                    <span className="font-medium tabular-nums text-gray-900">
                      ${goalAmount.toFixed(2).toLocaleString()}
                    </span>
                  )}
                </div>
                {goalAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-xs font-medium text-gray-500">
                      Progress
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        goalProgressPercentage >= 100
                          ? "text-green-600"
                          : "text-gray-900"
                      }`}
                    >
                      {goalProgressPercentage.toFixed(0)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {goalAmount > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  goalProgressPercentage >= 100
                    ? "bg-green-500"
                    : "bg-secondary"
                }`}
                style={{
                  width: `${goalProgressPercentage}%`,
                }}
              ></div>
            </div>
          )}
        </div>

        {/* Allocations List */}
        {pocket.allocations && pocket.allocations.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="mb-2 text-xs font-medium text-gray-500">
              Allocations
            </h4>
            <div className="space-y-2">
              {pocket.allocations.slice(0, 5).map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-surface p-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-gray-900">
                      {allocation.note ?? undefined}
                    </p>
                    <p className="text-xs text-gray-500">
                      {allocation.occurredAt
                        ? formatDateUTC(allocation.occurredAt)
                        : formatDateUTC(allocation.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-medium tabular-nums ${
                        allocation.withdrawal
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      $
                      {(typeof allocation.amount === "number" &&
                      !isNaN(allocation.amount)
                        ? allocation.amount
                        : 0
                      )
                        .toFixed(2)
                        .toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAllocation(allocation.id);
                      }}
                      className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                      title="Remove allocation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {pocket.allocations.length > 5 && (
                <p className="text-center text-xs text-gray-500">
                  +{pocket.allocations.length - 5} more allocations
                </p>
              )}
            </div>
          </div>
        )}

        {pocket.allocations && pocket.allocations.length === 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4 text-center">
            <p className="text-sm text-gray-500">No allocations yet</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!pocketToDelete}
        onClose={handleCancelDeletePocket}
        onConfirm={handleConfirmDeletePocket}
        title="Delete Pocket"
        message={`Are you sure you want to remove "${pocketToDelete?.name ?? ""}"? This action cannot be undone.`}
        itemName={pocketToDelete?.name ?? ""}
        isLoading={deletePocketMutation.isPending}
        confirmText="Delete Pocket"
      />

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
    </>
  );
}
