"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { CreateAllocationSchema } from "@/lib/api-schemas/savings";
import Button from "../Button";

interface AddAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAllocationSchema) => void;
  isLoading: boolean;
  pocketId: string;
}

export default function AddAllocationModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  pocketId,
}: AddAllocationModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [withdrawal, setWithdrawal] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setNote("");
      setWithdrawal(false);
      setOccurredAt("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return;

    const submitData: CreateAllocationSchema = {
      pocketId,
      amount: amountValue,
      withdrawal,
    };

    if (note.trim()) {
      submitData.note = note.trim();
    }

    if (occurredAt) {
      submitData.occurredAt = occurredAt;
    }

    onSubmit(submitData);

    // Reset form
    setAmount("");
    setNote("");
    setWithdrawal(false);
    setOccurredAt("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Add New Allocation
            </h2>
            <p className="text-sm text-gray-500">
              {withdrawal
                ? "Withdraw funds from this pocket"
                : "Add funds to this pocket"}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            {/* Amount Field */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Enter a positive amount.{" "}
                {withdrawal
                  ? "This will be subtracted from the pocket total."
                  : "This will be added to the pocket total."}
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive numbers
                    if (
                      value === "" ||
                      (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))
                    ) {
                      setAmount(value);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 text-sm outline-none transition-colors focus:border-gray-400"
                  required
                />
              </div>
            </div>

            {/* Note Field */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this allocation..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
              />
            </div>

            {/* Occurred At Field */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Occurred At (optional)
              </label>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
              />
            </div>

            {/* Withdrawal Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="withdrawal"
                checked={withdrawal}
                onChange={(e) => setWithdrawal(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="withdrawal"
                className="text-sm font-medium text-gray-700"
              >
                This is a withdrawal
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t p-5">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !amount}>
              {isLoading ? "Adding..." : "Add Allocation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
