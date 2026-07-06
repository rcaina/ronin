import { type User, type RecurringTransaction } from "@prisma/client";
import type {
  CreateRecurringTransactionSchema,
  UpdateRecurringTransactionSchema,
} from "@/lib/api-schemas/recurring";
import type { PrismaClientTx } from "../prisma";
import { HttpError } from "../errors";
import { getAccountEntitlements } from "./entitlements";
import { isPremium } from "../utils/entitlements";
import {
  computeDueOccurrences,
  findBudgetForOccurrence,
  previewUpcomingOccurrences,
  type BudgetWindow,
} from "../utils/recurring";

const recurringInclude = {
  category: {
    include: {
      defaultCategory: true,
    },
  },
  card: true,
} as const;

export const getRecurringTransactions = async (
  tx: PrismaClientTx,
  accountId: string,
) => {
  const templates = await tx.recurringTransaction.findMany({
    where: { accountId, deleted: null },
    include: recurringInclude,
    orderBy: { createdAt: "desc" },
  });

  const activeBudgets: BudgetWindow[] = await tx.budget.findMany({
    where: { accountId, deleted: null, status: "ACTIVE" },
    select: { id: true, status: true, startAt: true, endAt: true },
  });

  const now = new Date();

  return templates.map((template) => ({
    ...template,
    upcomingOccurrences: previewUpcomingOccurrences(template, 3),
    // Overdue and no ACTIVE budget currently covers the next occurrence —
    // surfaced in the UI as "needs a budget" rather than silently stalling.
    needsBudget:
      !template.paused &&
      template.nextRunAt.getTime() <= now.getTime() &&
      findBudgetForOccurrence(template.nextRunAt, activeBudgets) === null,
  }));
};

const getOwnedRecurringTransaction = async (
  tx: PrismaClientTx,
  id: string,
  user: User & { accountId: string },
): Promise<RecurringTransaction> => {
  const template = await tx.recurringTransaction.findFirst({
    where: { id, accountId: user.accountId, deleted: null },
  });
  if (!template) {
    throw new HttpError("Recurring transaction not found", 404);
  }
  return template;
};

export const createRecurringTransaction = async (
  tx: PrismaClientTx,
  data: CreateRecurringTransactionSchema,
  user: User & { accountId: string },
) => {
  return tx.recurringTransaction.create({
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      categoryId:
        data.categoryId && data.categoryId.trim() !== ""
          ? data.categoryId
          : null,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      transactionType: data.transactionType,
      frequency: data.frequency,
      nextRunAt: new Date(data.nextRunAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      accountId: user.accountId,
      userId: user.id,
    },
    include: recurringInclude,
  });
};

export const updateRecurringTransaction = async (
  tx: PrismaClientTx,
  id: string,
  data: UpdateRecurringTransactionSchema,
  user: User & { accountId: string },
) => {
  await getOwnedRecurringTransaction(tx, id, user);

  return tx.recurringTransaction.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      categoryId:
        data.categoryId !== undefined
          ? data.categoryId.trim() !== ""
            ? data.categoryId
            : null
          : undefined,
      cardId:
        data.cardId !== undefined
          ? data.cardId.trim() !== ""
            ? data.cardId
            : null
          : undefined,
      transactionType: data.transactionType,
      frequency: data.frequency,
      nextRunAt: data.nextRunAt ? new Date(data.nextRunAt) : undefined,
      endAt:
        data.endAt !== undefined
          ? data.endAt
            ? new Date(data.endAt)
            : null
          : undefined,
      paused: data.paused,
    },
    include: recurringInclude,
  });
};

export const deleteRecurringTransaction = async (
  tx: PrismaClientTx,
  id: string,
  user: User & { accountId: string },
) => {
  await getOwnedRecurringTransaction(tx, id, user);

  return tx.recurringTransaction.update({
    where: { id },
    data: { deleted: new Date() },
  });
};

/**
 * Posts every due occurrence for a single template, advancing `nextRunAt` as
 * it goes so a crash or concurrent run mid-loop can't double-post — each
 * successful post persists the pointer past that occurrence before moving to
 * the next one. Stops (without erroring) at the first occurrence with no
 * covering ACTIVE budget, leaving `nextRunAt` parked there — the "needs a
 * budget" hold — so the very next run retries it once a budget exists.
 *
 * Safe to call twice for the same template/now: the pointer guard means a
 * repeat call finds nothing new to post (see `computeDueOccurrences`), and
 * the `(recurringTransactionId, occurredAt)` unique index is a backstop in
 * case two runs somehow race before either persists its pointer update.
 */
export const postDueOccurrencesForTemplate = async (
  tx: PrismaClientTx,
  template: RecurringTransaction,
  now: Date,
): Promise<{ posted: number; heldAt: Date | null }> => {
  if (template.paused || template.deleted) {
    return { posted: 0, heldAt: null };
  }

  const { occurrences, nextRunAt: finalPointer } = computeDueOccurrences(
    template,
    now,
  );
  if (occurrences.length === 0) {
    return { posted: 0, heldAt: null };
  }

  const activeBudgets: BudgetWindow[] = await tx.budget.findMany({
    where: { accountId: template.accountId, deleted: null, status: "ACTIVE" },
    select: { id: true, status: true, startAt: true, endAt: true },
  });

  let posted = 0;

  for (let i = 0; i < occurrences.length; i++) {
    const occurrenceDate = occurrences[i]!;
    const budget = findBudgetForOccurrence(occurrenceDate, activeBudgets);

    if (!budget) {
      // Hold: no budget covers this occurrence yet. Park the pointer here —
      // don't touch later (also-due) occurrences until this one clears.
      await tx.recurringTransaction.update({
        where: { id: template.id },
        data: { nextRunAt: occurrenceDate },
      });
      return { posted, heldAt: occurrenceDate };
    }

    // Idempotency backstop: skip if this exact occurrence was already
    // posted (the unique index would reject a duplicate create anyway).
    const alreadyPosted = await tx.transaction.findFirst({
      where: {
        recurringTransactionId: template.id,
        occurredAt: occurrenceDate,
      },
      select: { id: true },
    });

    if (!alreadyPosted) {
      await tx.transaction.create({
        data: {
          name: template.name,
          description: template.description,
          amount: template.amount,
          budgetId: budget.id,
          categoryId: template.categoryId,
          cardId: template.cardId,
          accountId: template.accountId,
          userId: template.userId,
          transactionType: template.transactionType,
          occurredAt: occurrenceDate,
          recurringTransactionId: template.id,
        },
      });
    }
    posted++;

    const isLast = i === occurrences.length - 1;
    const nextPointer = isLast ? finalPointer : occurrences[i + 1]!;

    await tx.recurringTransaction.update({
      where: { id: template.id },
      data:
        nextPointer === null
          ? { nextRunAt: occurrenceDate, paused: true } // schedule exhausted
          : { nextRunAt: nextPointer },
    });
  }

  return { posted, heldAt: null };
};

export interface RecurringPostingSummary {
  templateId: string;
  posted: number;
  heldAt: Date | null;
}

/**
 * Posts every due, unpaused template for a single account. Premium-gated —
 * recurring transactions are a Premium feature end to end, so a downgraded
 * account's existing templates stop auto-posting (they stay visible,
 * view-only, per `canCreateRecurring`) until the account is premium again.
 * Used by both the lazy on-login catch-up and the cron job (looping accounts).
 */
export const postDueRecurringTransactionsForAccount = async (
  tx: PrismaClientTx,
  accountId: string,
  now: Date = new Date(),
): Promise<RecurringPostingSummary[]> => {
  const account = await getAccountEntitlements(tx, accountId);
  if (!isPremium(account)) return [];

  const templates = await tx.recurringTransaction.findMany({
    where: {
      accountId,
      deleted: null,
      paused: false,
      nextRunAt: { lte: now },
    },
  });

  const summaries: RecurringPostingSummary[] = [];
  for (const template of templates) {
    const result = await postDueOccurrencesForTemplate(tx, template, now);
    summaries.push({ templateId: template.id, ...result });
  }
  return summaries;
};
