import { TransactionType, type Budget, type Category, type Transaction } from "@prisma/client";

// budget region

export const formatBudget = (budget: Budget & { categories: (Category & { transactions: Transaction[] })[] }) => {
  return {
    ...budget,
    categories: budget.categories?.map(category => ({
      ...category,
      transactions: category.transactions || [],
    })) || [],
  };
};

export const formatBudgetCategories = (categories: (Category & { transactions: { id: string; name: string | null; description: string | null; amount: number, transactionType: TransactionType; createdAt: Date }[] })[]) => {
  // Calculate spent amount for each category
  return categories.map(category => ({
    ...category,
    spentAmount: category.transactions?.reduce((sum, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce spending (positive amount = refund received)
        return sum - (transaction.amount || 0);
      } else {
        // Regular transactions: positive = purchases (increase spending)
        return sum + (transaction.amount || 0);
      }
    }, 0) || 0,
    // Keep transactions for UI display
    transactions: category.transactions.map(transaction => ({
      id: transaction.id,
      name: transaction.name,
      description: transaction.description,
      amount: transaction.amount,
      transactionType: transaction.transactionType,
      createdAt: transaction.createdAt.toISOString(),
    })),
  }));
};