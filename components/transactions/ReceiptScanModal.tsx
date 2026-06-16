"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../Button";
import ReceiptReview from "./ReceiptReview";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useScanReceipt } from "@/lib/data-hooks/transactions/useReceiptScan";
import { downscaleImageToBase64 } from "@/lib/utils/image";
import type { ScanReceiptResult } from "@/lib/types/receipt";

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pre-selected budget; when omitted the user picks one before scanning. */
  budgetId?: string;
  cardId?: string;
}

export default function ReceiptScanModal({
  isOpen,
  onClose,
  onSuccess,
  budgetId,
  cardId,
}: ReceiptScanModalProps) {
  const { data: budgets = [] } = useBudgets();
  const { mutate: scan, isPending } = useScanReceipt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedBudgetId, setSelectedBudgetId] = useState(budgetId ?? "");
  const [result, setResult] = useState<ScanReceiptResult | null>(null);

  const reset = () => {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setSelectedBudgetId(budgetId ?? "");
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBudgetId) {
      toast.error("Select a budget first.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const { base64, mediaType } = await downscaleImageToBase64(file);
      scan(
        { budgetId: selectedBudgetId, imageBase64: base64, mediaType },
        {
          onSuccess: (data) => setResult(data),
          onError: (error: unknown) => {
            console.error("Receipt scan failed:", error);
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to scan receipt. Please try again.",
            );
          },
        },
      );
    } catch (err) {
      console.error("Image processing failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not process the image.",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        {result ? (
          <ReceiptReview
            result={result}
            budgetId={selectedBudgetId}
            cardId={cardId}
            onBack={reset}
            onClose={handleClose}
            onSuccess={onSuccess}
          />
        ) : (
          <div className="rounded-xl border bg-surface-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Scan a receipt
              </h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!budgetId && (
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Budget <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBudgetId}
                  onChange={(e) => setSelectedBudgetId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  disabled={isPending}
                >
                  <option value="">Select a budget</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
              disabled={isPending}
            />

            {isPending ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-secondary-600" />
                <p className="text-sm font-medium text-gray-900">
                  Reading your receipt…
                </p>
                <p className="text-xs text-gray-500">
                  Extracting items, tax, and categories.
                </p>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedBudgetId}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 py-12 text-center transition-colors hover:border-secondary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-secondary-600">
                  <Camera className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  Take a photo or upload a receipt
                </span>
                <span className="text-xs text-gray-500">
                  We&apos;ll suggest items, amounts, and categories for you to
                  review.
                </span>
              </button>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleClose} variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
