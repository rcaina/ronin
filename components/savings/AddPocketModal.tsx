"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { CreatePocketSchema } from "@/lib/api-schemas/savings";
import Button from "../Button";

interface AddPocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePocketSchema) => void;
  isLoading: boolean;
  savingsId: string;
}

export default function AddPocketModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  savingsId,
}: AddPocketModalProps) {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setGoalAmount("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      savingsId,
      goalAmount: goalAmount ? parseFloat(goalAmount) : undefined,
    });
    setName("");
    setGoalAmount("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Add New Pocket
            </h2>
            <p className="text-sm text-gray-500">Create a new savings pocket</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pocket Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Emergency Fund"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Goal Amount (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="text"
                  value={goalAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setGoalAmount(value);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 text-sm outline-none transition-colors focus:border-gray-400"
                />
              </div>
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
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Adding..." : "Add Pocket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
