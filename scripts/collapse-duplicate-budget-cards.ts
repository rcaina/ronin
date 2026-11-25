/**
 * Folds duplicate budget cards: where one budget holds several live copies of
 * the same general card (left behind by merging general cards, or by merging
 * monthly budgets into the continuous one), keeps the oldest copy and moves the
 * others' transactions and recurring templates onto it. Runs in one database
 * transaction; a dry run does the same work and rolls it back, so its counts
 * are exact. A second run folds nothing.
 *
 * Usage:
 *   pnpm cards:collapse-duplicates --dry-run   (prints the counts, changes nothing)
 *   pnpm cards:collapse-duplicates
 */
import { PrismaClient } from "@prisma/client";
import {
  collapseBudgetCopies,
  lockAccountCards,
} from "@/lib/api-services/cards";

const prisma = new PrismaClient();

class DryRunRollback extends Error {}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let folded = 0;
  let lookalikes = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        const dupes = await tx.$queryRaw<
          { accountId: string; defaultCardId: string }[]
        >`
          SELECT DISTINCT b."accountId", k."defaultCardId"
          FROM card k JOIN budgets b ON b.id = k."budgetId"
          WHERE k.deleted IS NULL AND k."defaultCardId" IS NOT NULL
          GROUP BY b."accountId", k."budgetId", k."defaultCardId" HAVING count(*) > 1
          ORDER BY b."accountId"`;
        // Holds off recurring posting and card merges, which take the same lock.
        for (const accountId of new Set(dupes.map((d) => d.accountId))) {
          await lockAccountCards(tx, accountId);
        }
        folded = await collapseBudgetCopies(
          tx,
          dupes.map((d) => d.defaultCardId),
        );
        const [left] = await tx.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM (
            SELECT 1 FROM card
            WHERE deleted IS NULL AND "budgetId" IS NOT NULL
            GROUP BY "budgetId", lower(trim(name)), coalesce("lastFourDigits", '')
            HAVING count(*) > 1) d`;
        lookalikes = left?.n ?? 0;
        if (dryRun) throw new DryRunRollback();
      },
      { timeout: 120_000 },
    );
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  console.log(
    folded === 0
      ? "Nothing to do: no budget holds two copies of the same card."
      : `${dryRun ? "Dry run: would fold" : "Folded"} ${folded} duplicate budget card(s) into their budget's oldest copy.${dryRun ? " Nothing was changed." : ""}`,
  );

  if (lookalikes > 0) {
    console.log(
      `Left alone: ${lookalikes} group(s) of same-named cards on one budget that aren't copies of one general card. If they come from duplicate general cards, merge those on the Cards page to fold them.`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to collapse duplicate budget cards:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
