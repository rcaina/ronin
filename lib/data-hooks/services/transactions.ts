import type { 
  CreateTransactionRequest, 
  UpdateTransactionRequest, 
  TransactionWithRelations 
} from "@/lib/types/transaction";
import type { CreateCardPaymentSchema } from "@/lib/api-schemas/transactions";



interface CardPaymentResponse {
  message: string;
  result?: {
    fromTransaction: TransactionWithRelations;
    toTransaction: TransactionWithRelations;
  };
  errors?: Array<{ message: string }>;
}

export const getTransactions = async (page = 1, limit = 20): Promise<{
  transactions: TransactionWithRelations[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`/api/transactions?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }
  
  return response.json() as Promise<{
    transactions: TransactionWithRelations[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
};

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

  if (!response.ok) {
    throw new Error("Failed to create transaction");
  }

  return response.json() as Promise<TransactionWithRelations>;
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

  if (!response.ok) {
    throw new Error("Failed to update transaction");
  }

  const result = await response.json() as { message: string; transaction: TransactionWithRelations };
  
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

export const createCardPayment = async (data: CreateCardPaymentSchema): Promise<{
  fromTransaction: TransactionWithRelations;
  toTransaction: TransactionWithRelations;
}> => {
  const response = await fetch("/api/transactions/card-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json() as CardPaymentResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "Failed to create card payment");
  }

  if (!result.result) {
    throw new Error("No card payment result returned from server");
  }

  return result.result;
}; 