import {
  TransactionType,
  type Budget,
  type Card,
  type Category,
  type Transaction,
} from "@prisma/client";
import { getSplitSpending, type SpendingSplit } from "@/lib/utils/spending";

// budget region

export const formatBudget = (
  budget: Budget & {
    categories: (Category & { transactions: Transaction[] })[];
    cards?: Card[];
  },
) => {
  return {
    ...budget,
    categories:
      budget.categories?.map((category) => ({
        ...category,
        transactions: category.transactions || [],
      })) || [],
    cards: budget.cards ?? [],
  };
};

export const formatBudgetCategories = (
  categories: (Category & {
    transactions: {
      id: string;
      name: string | null;
      description: string | null;
      amount: number;
      transactionType: TransactionType;
      createdAt: Date;
      occurredAt: Date | null;
    }[];
    // Split parents' share of this category's spend — the parent transaction
    // (categoryId = null) carries the sign-determining type, so it isn't
    // counted in `transactions` above. See lib/utils/spending.ts.
    transactionSplits?: SpendingSplit[];
  })[],
) => {
  // Calculate spent amount for each category
  return categories.map((category) => {
    const { transactionSplits, ...categoryFields } = category;

    const transactionsSpent =
      category.transactions?.reduce((sum, transaction) => {
        switch (transaction.transactionType) {
          case TransactionType.RETURN:
            // Returns reduce spending (positive amount = refund received)
            return sum - (transaction.amount || 0);
          case TransactionType.INCOME:
          case TransactionType.CARD_PAYMENT:
            // Income and card payments are money movement, not category spending
            return sum;
          default:
            // Regular transactions: positive = purchases (increase spending)
            return sum + (transaction.amount || 0);
        }
      }, 0) || 0;

    const splitsSpent = (transactionSplits ?? []).reduce(
      (sum, split) => sum + getSplitSpending(split),
      0,
    );

    return {
      ...categoryFields,
      spentAmount: transactionsSpent + splitsSpent,
      // Keep transactions for UI display
      transactions: category.transactions.map((transaction) => ({
        id: transaction.id,
        name: transaction.name,
        description: transaction.description,
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        createdAt: transaction.createdAt.toISOString(),
        occurredAt: transaction.occurredAt?.toISOString() ?? null,
      })),
    };
  });
};
