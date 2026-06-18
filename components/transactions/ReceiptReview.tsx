"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../Button";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import { useCreateTransactionsBatch } from "@/lib/data-hooks/transactions/useTransactions";
import {
  formatCurrency,
  getCategoryBadgeColor,
  roundToCents,
} from "@/lib/utils";
import { allocateReceipt } from "@/lib/utils/receipt";
import type { CreateTransactionRequest } from "@/lib/types/transaction";
import type { Card } from "@/lib/types/card";
import type { ScanReceiptResult } from "@/lib/types/receipt";
import { TransactionType } from "@prisma/client";
import type { CategoryType } from "@prisma/client";

interface EditableLineItem {
  key: string;
  description: string;
  amount: string;
  categoryId: string | null;
}

interface ReceiptReviewProps {
  result: ScanReceiptResult;
  budgetId: string;
  cardId?: string;
  onBack: () => void;
  onClose: () => void;
  onSuccess?: () => void;
}

const parseAmount = (value: string): number => {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : roundToCents(n);
};

export default function ReceiptReview({
  result,
  budgetId,
  cardId,
  onBack,
  onClose,
  onSuccess,
}: ReceiptReviewProps) {
  const { extraction, categories } = result;
  const { data: cards = [] } = useCards(undefined, budgetId);
  const { mutate: createBatch, isPending } = useCreateTransactionsBatch();

  const keyCounter = useRef(0);
  const nextKey = () => `li-${keyCounter.current++}`;

  const [merchant, setMerchant] = useState(extraction.merchant ?? "");
  const [purchasedAt, setPurchasedAt] = useState(extraction.purchasedAt ?? "");
  const [selectedCardId, setSelectedCardId] = useState(cardId ?? "");
  const [tax, setTax] = useState(extraction.tax.toString());
  const [tip, setTip] = useState(extraction.tip.toString());
  const [otherFees, setOtherFees] = useState(extraction.otherFees.toString());
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() =>
    extraction.lineItems.length
      ? extraction.lineItems.map((item) => ({
          key: nextKey(),
          description: item.description,
          amount: item.amount.toString(),
          categoryId: item.categoryId,
        }))
      : [{ key: nextKey(), description: "", amount: "", categoryId: null }],
  );

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const categoryGroup = useMemo(() => {
    const map = new Map<string, CategoryType>();
    categories.forEach((c) => map.set(c.id, c.group));
    return map;
  }, [categories]);

  // Live, deterministic allocation — recomputed on every edit so the per-category
  // amounts (with tax split proportionally) always reflect the current form.
  const allocation = useMemo(
    () =>
      allocateReceipt(
        lineItems.map((item) => ({
          description: item.description,
          amount: parseAmount(item.amount),
          categoryId: item.categoryId,
        })),
        {
          tax: parseAmount(tax),
          tip: parseAmount(tip),
          otherFees: parseAmount(otherFees),
        },
      ),
    [lineItems, tax, tip, otherFees],
  );

  const updateItem = (key: string, patch: Partial<EditableLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () =>
    setLineItems((prev) => [
      ...prev,
      { key: nextKey(), description: "", amount: "", categoryId: null },
    ]);

  const removeItem = (key: string) =>
    setLineItems((prev) => prev.filter((item) => item.key !== key));

  const hasUncategorized = lineItems.some((i) => i.categoryId === null);
  const hasInvalidAmount = lineItems.some((i) => parseAmount(i.amount) < 0);
  const canSave =
    lineItems.length > 0 &&
    !hasUncategorized &&
    !hasInvalidAmount &&
    allocation.grandTotal > 0 &&
    !isPending;

  const handleSave = () => {
    // One transaction per category, amount = its subtotal + proportional tax/fees.
    const transactions: CreateTransactionRequest[] = allocation.categories
      .filter((c) => c.categoryId !== null)
      .map((c) => {
        const itemList = c.lineItems
          .map((i) => i.description)
          .filter(Boolean)
          .join(", ");
        const taxNote =
          c.allocatedTax + c.allocatedExtra > 0
            ? `incl. ${formatCurrency(
                roundToCents(c.allocatedTax + c.allocatedExtra),
              )} tax/fees`
            : "";
        const description = [itemList, taxNote].filter(Boolean).join(" • ");

        return {
          name: merchant.trim() || undefined,
          description: description || undefined,
          amount: c.total,
          budgetId,
          categoryId: c.categoryId ?? undefined,
          cardId: selectedCardId || undefined,
          occurredAt: purchasedAt ? new Date(purchasedAt) : undefined,
          transactionType: TransactionType.REGULAR,
        };
      });

    if (transactions.length === 0) {
      toast.error("Add at least one categorized item before saving.");
      return;
    }

    createBatch(transactions, {
      onSuccess: () => {
        toast.success(
          `Saved ${transactions.length} transaction${
            transactions.length === 1 ? "" : "s"
          } from receipt!`,
        );
        onSuccess?.();
        onClose();
      },
      onError: (error: unknown) => {
        console.error("Failed to save receipt transactions:", error);
        toast.error("Failed to save transactions. Please try again.");
      },
    });
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

  return (
    <div className="rounded-xl border bg-surface-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Back to capture"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            Review receipt
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          Confidence {(extraction.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {result.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header fields */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Merchant
          </label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g., Whole Foods"
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Payment method
          </label>
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            className={inputClass}
            disabled={isPending}
          >
            <option value="">Select a payment method</option>
            {cards.map((card: Card) => (
              <option key={card.id} value={card.id}>
                {card.name} ({card.cardType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Items</h4>
          <Button
            onClick={addItem}
            variant="ghost"
            size="sm"
            disabled={isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 p-2"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(item.key, { description: e.target.value })
                }
                placeholder="Item"
                className="col-span-12 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:col-span-5"
                disabled={isPending}
              />
              <div className="relative col-span-5 sm:col-span-3">
                <span className="absolute left-2 top-1.5 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(item.key, { amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-300 py-1.5 pl-6 pr-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  disabled={isPending}
                />
              </div>
              <select
                value={item.categoryId ?? ""}
                onChange={(e) =>
                  updateItem(item.key, { categoryId: e.target.value || null })
                }
                className={`col-span-6 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 sm:col-span-3 ${
                  item.categoryId === null
                    ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                    : "border-gray-300 focus:border-secondary focus:ring-secondary"
                }`}
                disabled={isPending}
              >
                <option value="">Category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeItem(item.key)}
                className="col-span-1 flex justify-center rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remove item"
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Charges */}
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tax
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              disabled={isPending}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tip
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              disabled={isPending}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Other fees
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={otherFees}
              onChange={(e) => setOtherFees(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* Per-category summary */}
      <div className="mt-6 rounded-xl bg-surface-muted p-4">
        <h4 className="text-sm font-semibold text-gray-900">
          Will create {allocation.categories.filter((c) => c.categoryId).length}{" "}
          transaction
          {allocation.categories.filter((c) => c.categoryId).length === 1
            ? ""
            : "s"}
        </h4>
        <p className="mt-0.5 text-xs text-gray-500">
          Tax, tip, and fees are split across categories in proportion to each
          category&apos;s pre-tax subtotal.
        </p>

        <div className="mt-3 space-y-2">
          {allocation.categories.map((c, i) => (
            <div
              key={c.categoryId ?? `uncat-${i}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  c.categoryId
                    ? getCategoryBadgeColor(categoryGroup.get(c.categoryId))
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {c.categoryId
                  ? (categoryName.get(c.categoryId) ?? "Category")
                  : "Uncategorized"}
              </span>
              <span className="flex-1 truncate text-right text-xs text-gray-400">
                {formatCurrency(c.subtotal)}
                {c.allocatedTax + c.allocatedExtra > 0 && (
                  <>
                    {" + "}
                    {formatCurrency(
                      roundToCents(c.allocatedTax + c.allocatedExtra),
                    )}{" "}
                    tax/fees
                  </>
                )}
              </span>
              <span className="w-24 text-right font-semibold tabular-nums text-gray-900">
                {formatCurrency(c.total)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-semibold text-gray-900">
          <span>Total</span>
          <span className="tabular-nums">
            {formatCurrency(allocation.grandTotal)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
        <Button onClick={onClose} disabled={isPending} variant="outline">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          variant="primary"
          isLoading={isPending}
        >
          <Check className="mr-2 h-4 w-4" />
          Save {allocation.categories.filter((c) => c.categoryId).length ||
            ""}{" "}
          transaction
          {allocation.categories.filter((c) => c.categoryId).length === 1
            ? ""
            : "s"}
        </Button>
      </div>
    </div>
  );
}
