import type {
  CreateRecurringTransactionRequest,
  RecurringTransactionWithRelations,
  UpdateRecurringTransactionRequest,
} from "@/lib/types/recurring";
import { parseErrorResponse } from "./http";

export const getRecurringTransactions = async (): Promise<
  RecurringTransactionWithRelations[]
> => {
  const response = await fetch("/api/recurring");
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<RecurringTransactionWithRelations[]>;
};

export const createRecurringTransaction = async (
  data: CreateRecurringTransactionRequest,
): Promise<RecurringTransactionWithRelations> => {
  const response = await fetch("/api/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<RecurringTransactionWithRelations>;
};

export const updateRecurringTransaction = async (
  id: string,
  data: UpdateRecurringTransactionRequest,
): Promise<RecurringTransactionWithRelations> => {
  const response = await fetch(`/api/recurring/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<RecurringTransactionWithRelations>;
};

export const deleteRecurringTransaction = async (id: string): Promise<void> => {
  const response = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorResponse(response);
};

export const runRecurringCatchUp = async (): Promise<{ posted: number }> => {
  const response = await fetch("/api/recurring/catch-up", { method: "POST" });
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<{ posted: number }>;
};
