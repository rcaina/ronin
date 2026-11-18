/**
 * Hides the months the continuous-budget backfill made a category show in
 * without it being in that month's old monthly budget (see
 * `planBackfillGapHides`). Only categories the backfill created are touched,
 * and any category already hidden somewhere is left alone, so a second run
 * changes nothing. Each account runs in its own database transaction.
 *
 * Usage:
 *   pnpm categories:hide-backfill-gaps --dry-run   (prints the plan, changes nothing)
 *   pnpm categories:hide-backfill-gaps
 */
import {
  BudgetKind,
  PeriodType,
  PrismaClient,
  type Prisma,
} from "@prisma/client";
import {
  getMonthWindow,
  plannedForMonth,
  toMonthKey,
} from "@/lib/utils/budget-month";
import { planBackfillGapHides } from "@/lib/utils/continuous-merge";

const prisma = new PrismaClient();

// Same cutoff as scripts/migrate-to-continuous-budget.ts: monthly budgets made before it were merged.
const CUTOFF_MIGRATION = "20261116064245_continuous_budget_kind";

interface CategoryChange {
  category: string;
  monthsHidden: string;
  hiddenFrom: string;
}

class DryRunRollback extends Error {
  constructor(readonly changes: CategoryChange[]) {
    super("dry run");
  }
}

const spendingSelect = {
  transactionType: true,
  amount: true,
  occurredAt: true,
  createdAt: true,
} as const;

async function hideAccountGaps(
  tx: Prisma.TransactionClient,
  budgetId: string,
  accountId: string,
  cutoff: Date,
): Promise<CategoryChange[]> {
  const merged = await tx.budget.findMany({
    where: {
      accountId,
      kind: BudgetKind.EVENT,
      period: PeriodType.MONTHLY,
      createdAt: { lt: cutoff },
      deleted: { gte: cutoff },
    },
    select: { startAt: true, deleted: true },
  });
  if (merged.length === 0) return [];

  const lastLegacyMonth = merged
    .map((b) => toMonthKey(b.startAt))
    .sort()
    .at(-1)!;
  const mergedAt = new Date(
    Math.max(...merged.map((b) => b.deleted!.getTime())),
  );

  const categories = await tx.category.findMany({
    where: {
      budgetId,
      deleted: null,
      // The merge stamps `deleted` before writing month rows, so filter on the category: ones it created keep their old createdAt.
      createdAt: { lte: mergedAt },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      allocatedAmount: true,
      hiddenFrom: true,
      months: { select: { month: true, assigned: true, hidden: true } },
      transactions: { where: { deleted: null }, select: spendingSelect },
      transactionSplits: {
        where: { transaction: { deleted: null } },
        select: { amount: true, transaction: { select: spendingSelect } },
      },
    },
  });

  const changes: CategoryChange[] = [];
  for (const category of categories) {
    const plan = planBackfillGapHides(category, lastLegacyMonth);
    if (plan.hideMonths.length === 0 && !plan.hiddenFrom) continue;

    const starts = plan.hideMonths.map((month) => getMonthWindow(month).start);
    // Months the backfill planned at 0 already have a row: flag it, keeping its 0.
    await tx.categoryMonth.updateMany({
      where: { categoryId: category.id, month: { in: starts } },
      data: { hidden: true },
    });
    await tx.categoryMonth.createMany({
      data: plan.hideMonths.map((month, index) => ({
        categoryId: category.id,
        month: starts[index]!,
        assigned: plannedForMonth(category, month),
        hidden: true,
      })),
      skipDuplicates: true,
    });
    if (plan.hiddenFrom) {
      await tx.category.update({
        where: { id: category.id },
        data: { hiddenFrom: getMonthWindow(plan.hiddenFrom).start },
      });
    }

    changes.push({
      category: category.name,
      monthsHidden: plan.hideMonths.join(", ") || "-",
      hiddenFrom: plan.hiddenFrom ? `${plan.hiddenFrom} on` : "-",
    });
  }
  return changes;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [migration] = await prisma.$queryRaw<{ finished_at: Date | null }[]>`
    SELECT finished_at FROM _prisma_migrations
    WHERE migration_name = ${CUTOFF_MIGRATION} AND rolled_back_at IS NULL`;
  const cutoff = migration?.finished_at;
  if (!cutoff) {
    console.error(
      `Migration ${CUTOFF_MIGRATION} has not been applied to this database; run the migrations first.`,
    );
    process.exitCode = 1;
    return;
  }

  const budgets = await prisma.budget.findMany({
    where: { kind: BudgetKind.CONTINUOUS, deleted: null },
    select: { id: true, accountId: true },
  });

  const host = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(
    `${dryRun ? "[dry run] " : ""}Checking ${budgets.length} monthly budget(s) on ${host}.`,
  );

  for (const { id, accountId } of budgets) {
    try {
      const changes = await prisma
        .$transaction(
          async (tx) => {
            const result = await hideAccountGaps(tx, id, accountId, cutoff);
            if (dryRun) throw new DryRunRollback(result);
            return result;
          },
          { timeout: 120_000 },
        )
        .catch((error: unknown) => {
          if (error instanceof DryRunRollback) return error.changes;
          throw error;
        });
      if (changes.length === 0) continue;
      console.log(`\nAccount ${accountId}`);
      console.table(changes);
    } catch (error) {
      process.exitCode = 1;
      console.error(`\nAccount ${accountId} failed, left unchanged:`, error);
    }
  }

  if (dryRun) console.log("\nDry run: nothing was changed.");
}

main()
  .catch((error: unknown) => {
    console.error("Failed to hide backfill gap months:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
