"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, DollarSign, Info } from "lucide-react";
import type {
  BudgetWithRelations,
  CategoriesByGroup,
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";
import { TransactionType } from "@prisma/client";

interface BudgetCategoriesListViewProps {
  budget: BudgetWithRelations;
  budgetId: string;
  categoriesByGroup: CategoriesByGroup;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
}

export default function BudgetCategoriesListView({
  categoriesByGroup,
  getGroupColor,
  getGroupLabel,
}: BudgetCategoriesListViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Flatten all categories into a single list for the list view
  const allCategories = Object.entries(categoriesByGroup).flatMap(
    ([group, categories]) =>
      categories?.map((budgetCategory) => ({
        ...budgetCategory,
        group,
      })) ?? [],
  );

  if (allCategories.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="py-8 text-center text-gray-500">
          <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No budget categories yet</p>
          <p className="text-sm">Start adding categories to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
      <div className="h-[400px] overflow-y-auto sm:h-[500px] md:h-[600px]">
        <div className="space-y-2 pr-2">
          {allCategories.map((budgetCategory) => {
            // Skip if category relation is not loaded
            if (!budgetCategory.category) return null;

            const isExpanded = expandedCategories.has(budgetCategory.id);
            const transactions = budgetCategory.transactions ?? [];
            const spent = transactions.reduce((sum: number, transaction) => {
              if (transaction.transactionType === TransactionType.RETURN) {
                // Returns reduce spending (positive amount = refund received)
                return sum - transaction.amount;
              } else {
                // Regular transactions: positive = purchases (increase spending)
                return sum + transaction.amount;
              }
            }, 0);
            const percentage =
              budgetCategory.allocatedAmount > 0
                ? (spent / budgetCategory.allocatedAmount) * 100
                : 0;

            return (
              <div key={budgetCategory.id} className="space-y-2">
                {/* Category Row */}
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 sm:p-4"
                  onClick={() => toggleExpanded(budgetCategory.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div
                        className={`h-3 w-3 rounded-full ${getGroupColor(
                          budgetCategory.group.toLowerCase(),
                        )}`}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:space-x-2">
                          <p className="font-medium text-gray-900">
                            {budgetCategory.category.name}
                          </p>
                          <span className="text-sm text-gray-500">
                            ({getGroupLabel(budgetCategory.group)})
                          </span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:space-x-4">
                            <span>
                              Allocated: $
                              {budgetCategory.allocatedAmount.toLocaleString()}
                            </span>
                            <span>Spent: ${spent.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                percentage > 90
                                  ? "bg-red-500"
                                  : percentage > 75
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center space-x-2 sm:space-x-4">
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          spent > budgetCategory.allocatedAmount
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        ${spent.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        of ${budgetCategory.allocatedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div className="ml-4 space-y-2 sm:ml-8">
                    {transactions.length === 0 ? (
                      <div className="bg-gray-25 rounded-lg p-3 text-center text-sm text-gray-500 sm:p-4">
                        No transactions in this category
                      </div>
                    ) : (
                      transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2 sm:p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="truncate font-medium text-gray-900">
                                {transaction.name ?? "Unnamed transaction"}
                              </p>
                              {transaction.description && (
                                <div className="group relative flex-shrink-0">
                                  <Info className="h-4 w-4 cursor-help text-gray-400" />
                                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    {transaction.description}
                                    <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="truncate text-sm text-gray-500">
                              {new Date(
                                transaction.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 text-right">
                            <p className="font-medium text-gray-900">
                              ${transaction.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
