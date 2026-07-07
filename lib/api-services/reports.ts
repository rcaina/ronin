import type { PrismaClientTx } from "../prisma";
import type { ReportBudget } from "../utils/reports";

/**
 * Shape needed for report aggregation — categories with their spending
 * transactions/splits (see `lib/utils/spending.ts`), plus the account's cards
 * and uncategorized (income/card-payment) transactions for income math.
 * Mirrors the include used by `getBudgetById` in `lib/api-services/budgets.ts`,
 * just across (potentially) multiple budgets and without the UI-only fields.
 */
const reportBudgetInclude = {
  categories: {
    where: { deleted: null },
    include: {
      transactions: { where: { deleted: null } },
      // Split parents carry categoryId = null, so their share of the spend
      // lives here instead of in `transactions` above.
      transactionSplits: {
        where: { transaction: { deleted: null } },
        include: { transaction: true },
      },
    },
  },
  transactions: {
    where: {
      deleted: null,
      categoryId: null, // Only transactions without categories (card payments/income)
      splits: { none: {} }, // Split parents also have categoryId = null but are category spending
    },
    include: { card: true },
  },
  cards: {
    where: { deleted: null },
  },
} as const;

/**
 * The account's currently ACTIVE budget(s) — the Free-tier "current budget"
 * view (see `canViewReportHistory`), and also Premium's default view before
 * a history range is picked.
 */
export const getCurrentReportBudgets = async (
  tx: PrismaClientTx,
  accountId: string,
): Promise<ReportBudget[]> => {
  return tx.budget.findMany({
    where: { accountId, deleted: null, status: "ACTIVE" },
    include: reportBudgetInclude,
    orderBy: { startAt: "desc" },
  });
};

/**
 * Every budget (any status) whose date range overlaps `window` — the Premium
 * cross-budget history view. `window: null` returns every budget the account
 * has ever created ("all time").
 */
export const getHistoricalReportBudgets = async (
  tx: PrismaClientTx,
  accountId: string,
  window: { start: Date; end: Date } | null,
): Promise<ReportBudget[]> => {
  return tx.budget.findMany({
    where: {
      accountId,
      deleted: null,
      ...(window && {
        startAt: { lte: window.end },
        endAt: { gte: window.start },
      }),
    },
    include: reportBudgetInclude,
    orderBy: { startAt: "asc" },
  });
};
