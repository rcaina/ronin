"use client";

//show a list of budgets that are clickable
import { useRouter } from "next/navigation";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";

const BudgetsPage = () => {
  const router = useRouter();
  const { data: budgets = [], isLoading, error } = useBudgets();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading budgets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">
          Error loading budgets: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Budgets</h1>
      <div className="flex flex-col gap-4">
        {/**add a button to add a new budget to the top right of the page */}
        <div className="flex justify-end">
          <button className="rounded-lg bg-black/90 px-4 py-2 text-white hover:bg-black/80">
            Add Budget
          </button>
        </div>
        {budgets.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No budgets found. Create your first budget to get started.
          </div>
        ) : (
          budgets.map((budget) => (
            <div
              key={budget.id}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:bg-secondary"
              onClick={() => router.push(`/budgets/${budget.id}`)}
            >
              {/**show the budget name and amount limit with amount left to spend and created date on top right*/}
              <div className="flex justify-between">
                <h3 className="text-lg font-bold">{budget.name}</h3>
                <p className="text-sm text-gray-500">
                  Created: {new Date(budget.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-4">
                <p className="text-sm text-gray-500">
                  Limit: ${budget.income.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Type: {budget.type.replace("_", " ")}
                </p>
                <p className="text-sm text-gray-500">
                  Period: {budget.period.replace("_", " ")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BudgetsPage;
