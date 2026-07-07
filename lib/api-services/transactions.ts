import { type User, TransactionType } from "@prisma/client";
import type {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  CreateCardPaymentSchema,
  CreateTransactionsBatchSchema,
  TransactionSplitInput,
} from "@/lib/api-schemas/transactions";
import type { PrismaClientTx } from "../prisma";
import { HttpError } from "../errors";
import { roundToCents } from "../utils";
import { toIsoDateString } from "../utils/csv";
import {
  duplicateKey,
  normalizeName,
  type ImportRowContext,
  type NamedRef,
} from "../utils/transaction-import";

// Every transaction we return includes its splits + each split's category
// (with its default category), so callers never need a second fetch to
// render a split breakdown. Exported so other services querying Transaction
// directly (e.g. getCardTransactions in cards.ts) can reuse the same shape.
export const splitsInclude = {
  splits: {
    include: {
      category: {
        include: {
          defaultCategory: true,
        },
      },
    },
  },
} as const;

const transactionInclude = {
  category: {
    include: {
      defaultCategory: true,
    },
  },
  Budget: true,
  ...splitsInclude,
} as const;

// Split legs must sum to the transaction's total amount, within a
// sub-cent floating point tolerance (mirrors the zod schema check).
function splitsSumMatchesAmount(
  splits: Array<Pick<TransactionSplitInput, "amount">>,
  amount: number,
): boolean {
  const sum = roundToCents(
    splits.reduce((total, split) => total + split.amount, 0),
  );
  return Math.abs(sum - roundToCents(amount)) < 0.005;
}

// Every split categoryId must belong to the transaction's own budget.
async function validateSplitCategoriesBelongToBudget(
  tx: PrismaClientTx,
  budgetId: string,
  splits: TransactionSplitInput[],
): Promise<void> {
  const categoryIds = [...new Set(splits.map((split) => split.categoryId))];

  const categories = await tx.category.findMany({
    where: {
      id: { in: categoryIds },
      budgetId,
      deleted: null,
    },
    select: { id: true },
  });

  if (categories.length !== categoryIds.length) {
    const foundIds = new Set(categories.map((c) => c.id));
    const missing = categoryIds.filter((id) => !foundIds.has(id));
    throw new HttpError(
      "One or more split categories do not belong to this budget",
      400,
      { missingCategoryIds: missing },
    );
  }
}

export const getTransactions = async (
  tx: PrismaClientTx,
  accountId: string,
  pagination?: { page: number; limit: number; offset: number },
) => {
  const where = {
    accountId,
    deleted: null,
  };

  const include = transactionInclude;

  const orderBy = {
    createdAt: "desc" as const,
  };

  if (pagination) {
    const [transactions, totalCount] = await Promise.all([
      tx.transaction.findMany({
        where,
        include,
        orderBy,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      tx.transaction.count({ where }),
    ]);

    return { transactions, totalCount };
  } else {
    // For backward compatibility, return all transactions
    const transactions = await tx.transaction.findMany({
      where,
      include,
      orderBy,
    });
    return { transactions, totalCount: transactions.length };
  }
};

// Columns emitted by the CSV export, in order. Kept here (not in the route)
// so the shape is unit-testable and the header/row builders stay aligned.
export const EXPORT_COLUMNS = [
  "Date",
  "Name",
  "Description",
  "Amount",
  "Type",
  "Category",
  "Card",
  "Budget",
] as const;

/**
 * Returns every (non-deleted) transaction for the account as ordered CSV
 * field arrays plus the header row, ready to hand to `buildCsv`. Category and
 * card NAMES are emitted (never ids); split transactions list their split
 * categories joined by "; ". Dates are the ISO date of `occurredAt`
 * (falling back to `createdAt`).
 */
export const getTransactionsForExport = async (
  tx: PrismaClientTx,
  accountId: string,
): Promise<{ headers: string[]; rows: (string | number)[][] }> => {
  const transactions = await tx.transaction.findMany({
    where: { accountId, deleted: null },
    include: {
      category: { select: { name: true } },
      card: { select: { name: true } },
      Budget: { select: { name: true } },
      splits: { include: { category: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = transactions.map((t): (string | number)[] => {
    const categoryLabel =
      t.splits.length > 0
        ? t.splits.map((s) => s.category.name).join("; ")
        : (t.category?.name ?? "");

    return [
      toIsoDateString(t.occurredAt ?? t.createdAt),
      t.name ?? "",
      t.description ?? "",
      t.amount,
      t.transactionType,
      categoryLabel,
      t.card?.name ?? "",
      t.Budget?.name ?? "",
    ];
  });

  return { headers: [...EXPORT_COLUMNS], rows };
};

/**
 * Loads everything the import preview/commit needs for a given budget:
 * validates the budget belongs to the account (and is ACTIVE), then builds
 * the case-insensitive category/card lookups and the set of existing
 * (date+amount+name) keys used for duplicate detection.
 */
export const getImportContext = async (
  tx: PrismaClientTx,
  accountId: string,
  budgetId: string,
): Promise<{ budgetName: string; context: ImportRowContext }> => {
  const budget = await tx.budget.findFirst({
    where: { id: budgetId, accountId, deleted: null },
    select: { id: true, name: true, status: true },
  });

  if (!budget) {
    throw new HttpError("Budget not found", 404);
  }
  if (budget.status !== "ACTIVE") {
    throw new HttpError(
      "Transactions can only be imported into an active budget",
      400,
    );
  }

  const [categories, cards, existing] = await Promise.all([
    tx.category.findMany({
      where: { budgetId, deleted: null },
      select: { id: true, name: true },
    }),
    tx.card.findMany({
      where: { budgetId, deleted: null },
      select: { id: true, name: true },
    }),
    tx.transaction.findMany({
      where: { accountId, deleted: null },
      select: {
        name: true,
        amount: true,
        occurredAt: true,
        createdAt: true,
      },
    }),
  ]);

  const categoriesByName = new Map<string, NamedRef>();
  for (const c of categories) {
    // First match wins so a budget's own category name is stable.
    const key = normalizeName(c.name);
    if (!categoriesByName.has(key)) categoriesByName.set(key, c);
  }

  const cardsByName = new Map<string, NamedRef>();
  for (const c of cards) {
    const key = normalizeName(c.name);
    if (!cardsByName.has(key)) cardsByName.set(key, c);
  }

  const existingKeys = new Set<string>();
  for (const t of existing) {
    const iso = toIsoDateString(t.occurredAt ?? t.createdAt);
    if (iso) existingKeys.add(duplicateKey(iso, t.amount, t.name ?? ""));
  }

  return {
    budgetName: budget.name,
    context: { categoriesByName, cardsByName, existingKeys },
  };
};

export const createTransaction = async (
  tx: PrismaClientTx,
  data: CreateTransactionSchema,
  user: User & { accountId: string },
) => {
  const hasSplits = !!data.splits && data.splits.length > 0;

  if (hasSplits) {
    // data.splits is guaranteed defined by hasSplits, but narrow for TS.
    await validateSplitCategoriesBelongToBudget(
      tx,
      data.budgetId,
      data.splits!,
    );
  }

  // Create the transaction first
  const transaction = await tx.transaction.create({
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId:
        hasSplits || !data.categoryId || data.categoryId.trim() === ""
          ? null
          : data.categoryId,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      accountId: user.accountId,
      userId: user.id,
      transactionType: data.transactionType ?? TransactionType.REGULAR,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      ...(hasSplits && {
        splits: {
          createMany: {
            data: data.splits!.map((split) => ({
              categoryId: split.categoryId,
              amount: split.amount,
              note: split.note,
            })),
          },
        },
      }),
    },
    include: transactionInclude,
  });

  return transaction;
};

export const createTransactionsBatch = async (
  tx: PrismaClientTx,
  data: CreateTransactionsBatchSchema,
  user: User & { accountId: string },
) => {
  // Sequential within the caller's prisma.$transaction so the whole receipt
  // either lands or doesn't — no half-saved splits.
  const created = [];
  for (const transaction of data.transactions) {
    created.push(await createTransaction(tx, transaction, user));
  }
  return created;
};

export async function updateTransaction(
  tx: PrismaClientTx,
  id: string,
  data: UpdateTransactionSchema,
  user: User & { accountId: string },
) {
  const hasSplits = !!data.splits && data.splits.length > 0;
  const clearsSplits =
    !hasSplits && !!data.categoryId && data.categoryId.trim() !== "";

  if (hasSplits) {
    // Re-check §2 invariants against the final state (payload value if
    // provided, otherwise the value already stored on the row).
    const existing = await tx.transaction.findFirst({
      where: {
        id,
        accountId: user.accountId,
        deleted: null,
      },
      select: {
        amount: true,
        budgetId: true,
        transactionType: true,
      },
    });

    if (!existing) {
      throw new HttpError(
        "Transaction does not exist or is not in user's account",
        404,
      );
    }

    const finalBudgetId = data.budgetId ?? existing.budgetId;
    const finalTransactionType =
      data.transactionType ?? existing.transactionType;
    const finalAmount = data.amount ?? existing.amount;

    if (
      finalTransactionType !== TransactionType.REGULAR &&
      finalTransactionType !== TransactionType.RETURN
    ) {
      throw new HttpError(
        "Splits are only supported for REGULAR or RETURN transactions",
        400,
      );
    }

    if (!splitsSumMatchesAmount(data.splits!, finalAmount)) {
      throw new HttpError(
        "Split amounts must sum to the transaction amount",
        400,
      );
    }

    await validateSplitCategoriesBelongToBudget(
      tx,
      finalBudgetId,
      data.splits!,
    );
  } else if (
    !clearsSplits &&
    (data.amount !== undefined || data.transactionType !== undefined)
  ) {
    // The payload neither replaces nor clears splits, but touches a field the
    // split invariants depend on. If the stored row is a split transaction,
    // the update must keep splits summing to the amount and the type
    // splittable — otherwise callers must send new splits (or a categoryId).
    const existing = await tx.transaction.findFirst({
      where: {
        id,
        accountId: user.accountId,
        deleted: null,
      },
      select: {
        splits: { select: { amount: true } },
      },
    });

    if (existing && existing.splits.length > 0) {
      if (
        data.transactionType !== undefined &&
        data.transactionType !== TransactionType.REGULAR &&
        data.transactionType !== TransactionType.RETURN
      ) {
        throw new HttpError(
          "Splits are only supported for REGULAR or RETURN transactions",
          400,
        );
      }

      if (
        data.amount !== undefined &&
        !splitsSumMatchesAmount(existing.splits, data.amount)
      ) {
        throw new HttpError(
          "Changing the amount of a split transaction requires updated splits that sum to the new amount",
          400,
        );
      }
    }
  }

  return await tx.transaction.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: hasSplits
        ? null
        : data.categoryId && data.categoryId.trim() !== ""
          ? data.categoryId
          : null,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      transactionType: data.transactionType,
      ...(hasSplits
        ? {
            splits: {
              deleteMany: {},
              createMany: {
                data: data.splits!.map((split) => ({
                  categoryId: split.categoryId,
                  amount: split.amount,
                  note: split.note,
                })),
              },
            },
          }
        : clearsSplits
          ? { splits: { deleteMany: {} } }
          : {}),
    },
    include: transactionInclude,
  });
}

export async function deleteTransaction(
  tx: PrismaClientTx,
  id: string,
  user: User & { accountId: string },
) {
  return await tx.transaction.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });
}

export async function createCardPayment(
  tx: PrismaClientTx,
  data: CreateCardPaymentSchema,
  user: User & { accountId: string },
) {
  // Create two linked transactions, both storing the positive payment amount
  // (enforced by createCardPaymentSchema). Card balance math interprets a
  // CARD_PAYMENT as money out on the source (debit/cash) card and as a
  // balance reduction on the destination (credit) card.
  const fromTransaction = await tx.transaction.create({
    data: {
      name: data.name ?? `Payment from ${data.fromCardId}`,
      description: data.description ?? `Card payment to ${data.toCardId}`,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: null, // No category for card payments
      cardId: data.fromCardId,
      accountId: user.accountId,
      userId: user.id,
      transactionType: TransactionType.CARD_PAYMENT,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: transactionInclude,
  });

  const toTransaction = await tx.transaction.create({
    data: {
      name: data.name ?? `Payment to ${data.toCardId}`,
      description: data.description ?? `Card payment from ${data.fromCardId}`,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: null, // No category for card payments
      cardId: data.toCardId,
      accountId: user.accountId,
      userId: user.id,
      transactionType: TransactionType.CARD_PAYMENT,
      linkedTransactionId: fromTransaction.id, // Link to the source transaction
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: transactionInclude,
  });

  // Update the source transaction to link to the destination transaction
  await tx.transaction.update({
    where: { id: fromTransaction.id },
    data: { linkedTransactionId: toTransaction.id },
  });

  return {
    fromTransaction,
    toTransaction,
  };
}
