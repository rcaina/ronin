"use client";

import { DollarSign, Info } from "lucide-react";

interface Transaction {
  id: string;
  name: string | null;
  description?: string | null;
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
        All Transactions ({transactions.length})
      </h3>
      <div className="h-[600px] overflow-y-auto">
        <div className="space-y-4 pr-2">
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
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">
                        {transaction.name ?? "Unnamed transaction"}
                      </p>
                      {transaction.description && (
                        <div className="group relative">
                          <Info className="h-4 w-4 cursor-help text-gray-400" />
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            {transaction.description}
                            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
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
    </div>
  );
}
