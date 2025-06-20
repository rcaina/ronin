"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams } from "next/navigation";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const { data: budget, isLoading, error } = useBudget(id as string);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading budget...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">
          Error loading budget: {error.message}
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Budget not found</div>
      </div>
    );
  }

  // Calculate total spent from categories and their transactions
  const totalSpent = (budget.categories ?? []).reduce(
    (categoryTotal: number, category) => {
      const categorySpent = (category.transactions ?? []).reduce(
        (transactionTotal: number, transaction) => {
          return transactionTotal + transaction.amount;
        },
        0,
      );
      return categoryTotal + categorySpent;
    },
    0,
  );

  return (
    <div>
      <h1>Budget Details</h1>
      <div className="flex justify-between">
        <h3 className="text-lg font-bold">{budget.name}</h3>
        <p className="text-sm text-gray-500">
          Created:{" "}
          {new Date(budget.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="flex gap-4">
        <p className="text-sm text-gray-500">
          Limit: ${budget.income.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          Spent: ${totalSpent.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          Remaining: ${(budget.income - totalSpent).toLocaleString()}
        </p>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">
          Type: {budget.strategy.replace("_", " ")}
        </p>
        <p className="text-sm text-gray-500">
          Period: {budget.period.replace("_", " ")}
        </p>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold">Categories</h2>
        <div className="flex flex-col gap-4">
          {budget.categories.map((category) => (
            <div key={category.id}>
              <h3 className="text-lg font-bold">{category.name}</h3>
              <p className="text-sm text-gray-500">
                Spent: $
                {category.transactions
                  .reduce((acc, transaction) => acc + transaction.amount, 0)
                  .toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Remaining: $
                {(
                  category.spendingLimit -
                  category.transactions.reduce(
                    (acc, transaction) => acc + transaction.amount,
                    0,
                  )
                ).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-bold">Transactions</h2>
          <div className="flex flex-col gap-4">
            {budget.categories
              .flatMap((category) => category.transactions)
              .map((transaction) => (
                <div key={transaction.id}>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transaction.amount.toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDetailsPage;
