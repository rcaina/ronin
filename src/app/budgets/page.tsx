"use client";

//show a list of budgets that are clickable
import { useState } from "react";
import { useRouter } from "next/navigation";

const BudgetsPage = () => {
  const router = useRouter();
  const [budgets] = useState([
    {
      id: 1,
      name: "Budget 1",
      amount: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Budget 2",
      amount: 2000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: "Budget 3",
      amount: 3000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

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
        {budgets.map((budget) => (
          <div
            key={budget.id}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:bg-secondary"
            onClick={() => router.push(`/budgets/${budget.id}`)}
          >
            {/**show the budget name and amount limit with amount left to spend and created date on top right*/}
            <div className="flex justify-between">
              <h3 className="text-lg font-bold">{budget.name}</h3>
              <p className="text-sm text-gray-500">
                Created: {budget.createdAt.toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-4">
              <p className="text-sm text-gray-500">
                Limit: {budget.amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Spent: {budget.amount.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetsPage;
