/**
 * Merges each account's monthly budgets into its continuous budget.
 *
 * Per account: gets or creates the continuous budget, maps every category and
 * card of the monthly budgets onto it (see `planContinuousMerge`), writes one
 * planned amount per category per merged month (keeping rows that already
 * exist), repoints transactions, split legs and recurring templates, then soft
 * deletes the merged budgets with their categories and cards. Each account
 * runs in its own database transaction. A second run finds nothing to merge.
 *
 * Usage:
 *   pnpm budgets:merge-continuous --dry-run   (prints the summary, changes nothing)
 *   pnpm budgets:merge-continuous
 */
import {
  BudgetKind,
  PeriodType,
  PrismaClient,
  type Prisma,
} from "@prisma/client";
import {
  ensureMainDebitCard,
  newContinuousBudgetData,
} from "@/lib/api-services/budgets";
import { getMonthWindow, toMonthKey } from "@/lib/utils/budget-month";
import { planContinuousMerge } from "@/lib/utils/continuous-merge";

const prisma = new PrismaClient();

interface AccountSummary {
  createdContinuousBudget: boolean;
  budgetsMerged: number;
  months: string;
  categoriesMatched: number;
  categoriesCreated: number;
  cardsMatched: number;
  cardsCreated: number;
  plannedRowsWritten: number;
  plannedRowsKept: number;
  transactionsMoved: number;
  splitLegsMoved: number;
  recurringMoved: number;
}

class DryRunRollback extends Error {
  constructor(readonly summary: AccountSummary) {
    super("dry run");
  }
}

async function mergeAccount(
  tx: Prisma.TransactionClient,
  accountId: string,
  now: Date,
): Promise<AccountSummary> {
  const sources = await tx.budget.findMany({
    where: {
      accountId,
      kind: BudgetKind.EVENT,
      period: PeriodType.MONTHLY,
      deleted: null,
    },
    include: {
      categories: { where: { deleted: null } },
      cards: { where: { deleted: null } },
    },
    orderBy: { startAt: "asc" },
  });
  const sourceIds = sources.map((budget) => budget.id);
  const earliestMonth = getMonthWindow(toMonthKey(sources[0]!.startAt)).start;
  const latest = sources[sources.length - 1]!;

  let continuous = await tx.budget.findFirst({
    where: { accountId, kind: BudgetKind.CONTINUOUS, deleted: null },
  });
  const createdContinuousBudget = !continuous;
  if (!continuous) {
    continuous = await tx.budget.create({
      data: {
        ...newContinuousBudgetData(accountId),
        strategy: latest.strategy,
        startAt: earliestMonth,
      },
    });
  } else if (earliestMonth < continuous.startAt) {
    continuous = await tx.budget.update({
      where: { id: continuous.id },
      data: { startAt: earliestMonth },
    });
  }

  const plan = planContinuousMerge(
    {
      categories: await tx.category.findMany({
        where: { budgetId: continuous.id, deleted: null },
      }),
      cards: await tx.card.findMany({
        where: { budgetId: continuous.id, deleted: null },
      }),
    },
    sources,
  );

  const summary: AccountSummary = {
    createdContinuousBudget,
    budgetsMerged: sources.length,
    months: [
      ...new Set(sources.map((budget) => toMonthKey(budget.startAt))),
    ].join(", "),
    categoriesMatched: 0,
    categoriesCreated: 0,
    cardsMatched: 0,
    cardsCreated: 0,
    plannedRowsWritten: 0,
    plannedRowsKept: 0,
    transactionsMoved: 0,
    splitLegsMoved: 0,
    recurringMoved: await tx.recurringTransaction.count({
      where: {
        OR: [
          {
            categoryId: {
              in: sources.flatMap((b) => b.categories.map((c) => c.id)),
            },
          },
          { cardId: { in: sources.flatMap((b) => b.cards.map((c) => c.id)) } },
        ],
      },
    }),
  };

  for (const group of plan.categories) {
    const { template } = group;
    const targetId =
      group.targetId ??
      (
        await tx.category.create({
          data: {
            budgetId: continuous.id,
            name: template.name,
            group: template.group,
            defaultCategoryId: template.defaultCategoryId,
            allocatedAmount: template.allocatedAmount,
            createdAt: group.firstCreatedAt,
          },
        })
      ).id;
    if (!group.targetId) summary.categoriesCreated += 1;
    else if (group.sourceIds.length > 0) summary.categoriesMatched += 1;

    const fromSources = { categoryId: { in: group.sourceIds } };
    const toTarget = { categoryId: targetId };
    await tx.transaction.updateMany({ where: fromSources, data: toTarget });
    summary.splitLegsMoved += (
      await tx.transactionSplit.updateMany({
        where: fromSources,
        data: toTarget,
      })
    ).count;
    await tx.recurringTransaction.updateMany({
      where: fromSources,
      data: toTarget,
    });

    const rows = [...group.months].map(([month, assigned]) => ({
      categoryId: targetId,
      month: getMonthWindow(month).start,
      assigned,
    }));
    const { count } = await tx.categoryMonth.createMany({
      data: rows,
      skipDuplicates: true,
    });
    summary.plannedRowsWritten += count;
    summary.plannedRowsKept += rows.length - count;
  }

  for (const group of plan.cards) {
    const { template } = group;
    const targetId =
      group.targetId ??
      (
        await tx.card.create({
          data: {
            budgetId: continuous.id,
            name: template.name,
            lastFourDigits: template.lastFourDigits,
            cardType: template.cardType,
            spendingLimit: template.spendingLimit,
            defaultCardId: template.defaultCardId,
            userId: template.userId,
            amountSpent: 0,
          },
        })
      ).id;
    summary[group.targetId ? "cardsMatched" : "cardsCreated"] += 1;

    const fromSources = { cardId: { in: group.sourceIds } };
    const toTarget = { cardId: targetId };
    await tx.transaction.updateMany({ where: fromSources, data: toTarget });
    await tx.recurringTransaction.updateMany({
      where: fromSources,
      data: toTarget,
    });
  }

  summary.transactionsMoved = (
    await tx.transaction.updateMany({
      where: { budgetId: { in: sourceIds } },
      data: { budgetId: continuous.id },
    })
  ).count;

  const deleted = { deleted: now };
  await tx.category.updateMany({
    where: { budgetId: { in: sourceIds }, deleted: null },
    data: deleted,
  });
  await tx.card.updateMany({
    where: { budgetId: { in: sourceIds }, deleted: null },
    data: deleted,
  });
  await tx.budget.updateMany({
    where: { id: { in: sourceIds } },
    data: deleted,
  });

  if (createdContinuousBudget) {
    const member = await tx.accountUser.findFirstOrThrow({
      where: { accountId },
      orderBy: { id: "asc" },
    });
    await ensureMainDebitCard(tx, continuous.id, member.userId);
  }

  return summary;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();

  const accounts = await prisma.budget.findMany({
    where: {
      kind: BudgetKind.EVENT,
      period: PeriodType.MONTHLY,
      deleted: null,
    },
    distinct: ["accountId"],
    select: { accountId: true },
  });

  if (accounts.length === 0) {
    console.log("Nothing to merge: no account has a monthly budget left.");
    return;
  }

  console.log(
    `${dryRun ? "[dry run] " : ""}Merging monthly budgets for ${accounts.length} account(s).`,
  );

  for (const { accountId } of accounts) {
    try {
      const summary = await prisma
        .$transaction(
          async (tx) => {
            const result = await mergeAccount(tx, accountId, now);
            if (dryRun) throw new DryRunRollback(result);
            return result;
          },
          { timeout: 120_000 },
        )
        .catch((error: unknown) => {
          if (error instanceof DryRunRollback) return error.summary;
          throw error;
        });
      console.log(`\nAccount ${accountId}`);
      console.table(summary);
    } catch (error) {
      process.exitCode = 1;
      console.error(`\nAccount ${accountId} failed, left unchanged:`, error);
    }
  }

  if (dryRun) console.log("\nDry run: nothing was changed.");
}

main()
  .catch((error: unknown) => {
    console.error("Failed to merge monthly budgets:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
