"use client";

import { DollarSign } from "lucide-react";

interface Transaction {
  id: string;
  name: string | null;
  amount: number;
  createdAt: Date;
  categoryName: string;
  categoryGroup: string;
}

interface BudgetTransactionsListProps {
  transactions: Transaction[];
  getGroupColor: (group: string) => string;
}

export default function BudgetTransactionsList({
  transactions,
  getGroupColor,
}: BudgetTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          All Transactions
        </h3>
        <div className="py-8 text-center text-gray-500">
          <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No transactions yet</p>
          <p className="text-sm">Start adding transactions to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        All Transactions
      </h3>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <div
                  className={`h-3 w-3 rounded-full ${getGroupColor(
                    transaction.categoryGroup.toLowerCase(),
                  )}`}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.name ?? "Unnamed transaction"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transaction.categoryName}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-medium ${transaction.amount < 0 ? "text-green-600" : "text-gray-900"}`}
              >
                {transaction.amount < 0 ? "-" : ""}$
                {Math.abs(transaction.amount).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(transaction.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
