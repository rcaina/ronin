import type { 
  CreateTransactionRequest, 
  UpdateTransactionRequest, 
  TransactionWithRelations 
} from "@/lib/types/transaction";

interface ApiResponse<T> {
  message: string;
  transaction?: T;
  errors?: Array<{ message: string }>;
}

export const getTransactions = async (): Promise<TransactionWithRelations[]> => 
  fetch("/api/transactions").then((res) => res.json()) as Promise<TransactionWithRelations[]>;

export const createTransaction = async (data: CreateTransactionRequest): Promise<TransactionWithRelations> => {
  // // Convert Date objects to ISO strings for API
  // const apiData = {
  //   ...data,
  //   occurredAt: data.occurredAt ? data.occurredAt.toISOString() : undefined,
  // };

  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json() as ApiResponse<TransactionWithRelations>;

  if (!response.ok) {
    throw new Error(result.message ?? "Failed to create transaction");
  }

  if (!result.transaction) {
    throw new Error("No transaction returned from server");
  }

  return result.transaction;
};

export const updateTransaction = async (id: string, data: UpdateTransactionRequest): Promise<TransactionWithRelations> => {
  // Convert Date objects to ISO strings for API
  // const apiData = {
  //   ...data,
  //   occurredAt: data.occurredAt ? data.occurredAt.toISOString() : undefined,
  // };

  const response = await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json() as ApiResponse<TransactionWithRelations>;

  if (!response.ok) {
    throw new Error(result.message ?? "Failed to update transaction");
  }

  if (!result.transaction) {
    throw new Error("No transaction returned from server");
  }

  return result.transaction;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete transaction: ${response.statusText}`);
  }
}; 