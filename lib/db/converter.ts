import { type Budget, type BudgetCategory, type Category, type Transaction } from "@prisma/client";

export const formatBudget = (budget: Budget & { categories: (BudgetCategory & { category: Category, transactions: Transaction[] })[] }) => {
  return {
    ...budget,
    categories: budget.categories?.map(budgetCategory => ({
      ...budgetCategory,
      category: {
        id: budgetCategory.category.id,
        name: budgetCategory.category.name,
        group: budgetCategory.category.group,   
      },
      transactions: budgetCategory.transactions || [],
    })) || [],
  };
};