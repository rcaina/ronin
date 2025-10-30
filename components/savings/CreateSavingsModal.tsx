"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../Button";
import type { CreateSavingsSchema } from "@/lib/api-schemas/savings";
import { useSavingsMutations } from "@/lib/data-hooks/savings/useSavings";

interface CreateSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateSavingsModal({
  isOpen,
  onClose,
}: CreateSavingsModalProps) {
  const { addSavings } = useSavingsMutations();
  // Initialize the mutation hook at render time to satisfy React hook rules
  const createSavings = addSavings();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateSavingsSchema = {
        name: name.trim(),
      };
      await createSavings.mutateAsync(payload);
      toast.success("Savings account created");
      onClose();
    } catch {
      toast.error("Failed to create savings account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Add Savings Account
            </h2>
            <p className="text-sm text-gray-500">
              Create a new savings account
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t p-5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
