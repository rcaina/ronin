/**
 * Moves every live transaction whose card is not on its budget (a general
 * card, or another budget's card) onto that budget's copy of the same card,
 * creating the copy when the budget has none. Transactions on deleted budgets
 * are left alone. Runs in one database transaction; a dry run does the same
 * work and rolls it back, so its counts are exact. A second run finds nothing.
 *
 * Usage:
 *   pnpm cards:repoint-transactions --dry-run   (prints the counts, changes nothing)
 *   pnpm cards:repoint-transactions
 */
import { PrismaClient } from "@prisma/client";
import { resolveBudgetCard } from "@/lib/api-services/cards";

const prisma = new PrismaClient();

class DryRunRollback extends Error {}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const summary = { groups: 0, transactions: 0, copiesCreated: 0 };

  try {
    await prisma.$transaction(
      async (tx) => {
        const groups = await tx.$queryRaw<
          { cardId: string; budgetId: string }[]
        >`
          SELECT DISTINCT t."cardId", t."budgetId"
          FROM transactions t
          JOIN card k ON k.id = t."cardId"
          JOIN budgets b ON b.id = t."budgetId"
          WHERE t.deleted IS NULL AND b.deleted IS NULL
            AND (k."budgetId" IS NULL OR k."budgetId" <> t."budgetId")`;

        for (const { cardId, budgetId } of groups) {
          const target = await resolveBudgetCard(tx, cardId, budgetId);
          const { count } = await tx.transaction.updateMany({
            where: { cardId, budgetId, deleted: null },
            data: { cardId: target.cardId },
          });
          summary.groups += 1;
          summary.transactions += count;
          if (target.created) summary.copiesCreated += 1;
        }

        if (dryRun) throw new DryRunRollback();
      },
      { timeout: 120_000 },
    );
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  const recurringOnGeneralCard = await prisma.recurringTransaction.count({
    where: { deleted: null, card: { budgetId: null } },
  });

  if (summary.groups === 0) {
    console.log(
      "Nothing to do: every live transaction's card is on its budget.",
    );
  } else {
    console.log(
      `${dryRun ? "Dry run: would move" : "Moved"} ${summary.transactions} transaction(s) in ${summary.groups} card/budget group(s); ${summary.copiesCreated} budget card copy(ies) ${dryRun ? "would be " : ""}created.${dryRun ? " Nothing was changed." : ""}`,
    );
  }
  console.log(
    `Recurring templates on a general card (left alone, the poster resolves them): ${recurringOnGeneralCard}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Failed to repoint card transactions:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
