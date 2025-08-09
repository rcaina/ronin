import { TransactionType, type Budget, type BudgetCategory, type Category, type Transaction } from "@prisma/client";

// budget region

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

export const formatBudgetCategories = (budgetCategories: (BudgetCategory & { category: Category, transactions: { amount: number, transactionType: TransactionType }[] })[]) => {
  // Calculate spent amount for each budget category
  return budgetCategories.map(budgetCategory => ({
    ...budgetCategory,
    spentAmount: budgetCategory.transactions?.reduce((sum, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce spending (positive amount = refund received)
        return sum - (transaction.amount || 0);
      } else {
        // Regular transactions: positive = purchases (increase spending)
        return sum + (transaction.amount || 0);
      }
    }, 0) || 0,
    transactions: undefined, // Remove transactions from response
  }));
};