/**
 * Repairs duplicate cards, including duplicates a user already deleted by hand:
 *
 * 1. A deleted general card with a live twin (same owner, type, name and last
 *    four): its live budget copies, recurring templates and transactions move
 *    to the twin.
 * 2. A budget holding several live copies of one general card: the oldest copy
 *    is kept and the others are folded into it.
 * 3. A deleted budget card whose budget still holds a live copy of the same
 *    card (same general card, else same owner, type, name and last four): its
 *    transactions and recurring templates move to that copy, so they count
 *    toward its balance again.
 *
 * Cards with no live twin are left alone. Runs in one database transaction; a
 * dry run does the same work and rolls it back, so its counts are exact. A
 * second run changes nothing.
 *
 * Usage:
 *   pnpm cards:collapse-duplicates --dry-run   (prints the counts, changes nothing)
 *   pnpm cards:collapse-duplicates
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { collapseBudgetCopies } from "@/lib/api-services/cards";

const prisma = new PrismaClient();

class DryRunRollback extends Error {}

type Move = { fromId: string; toId: string };

const sameCard = (a: string, b: string) =>
  Prisma.raw(`${b}."userId" = ${a}."userId" AND ${b}."cardType" = ${a}."cardType"
    AND lower(trim(${b}.name)) = lower(trim(${a}.name))
    AND coalesce(${b}."lastFourDigits", '') = coalesce(${a}."lastFourDigits", '')`);

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const summary = {
    generalsRelinked: 0,
    copiesFolded: 0,
    deletedCopiesRehomed: 0,
    strandedTransactionsMoved: 0,
    strandedRecurringMoved: 0,
  };
  let lookalikes = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Every account's lockAccountCards lock, taken before any read so recurring posting and card merges can't move cards underneath the repair.
        await tx.$queryRaw`SELECT id FROM accounts ORDER BY id FOR NO KEY UPDATE`;
        const moveRows = async (moves: Move[]) => {
          for (const { fromId, toId } of moves) {
            const data = { cardId: toId };
            const where = { cardId: fromId };
            summary.strandedTransactionsMoved += (
              await tx.transaction.updateMany({ where, data })
            ).count;
            summary.strandedRecurringMoved += (
              await tx.recurringTransaction.updateMany({ where, data })
            ).count;
          }
        };

        const deletedGenerals = await tx.$queryRaw<Move[]>`
          SELECT DISTINCT ON (g.id) g.id AS "fromId", live.id AS "toId"
          FROM card g
          JOIN card live ON live."budgetId" IS NULL AND live.deleted IS NULL
            AND live.id <> g.id AND ${sameCard("g", "live")}
          WHERE g."budgetId" IS NULL AND g.deleted IS NOT NULL
            AND (EXISTS (SELECT 1 FROM card c WHERE c."defaultCardId" = g.id AND c.deleted IS NULL)
              OR EXISTS (SELECT 1 FROM recurring_transactions r WHERE r."cardId" = g.id AND r.deleted IS NULL)
              OR EXISTS (SELECT 1 FROM transactions t WHERE t."cardId" = g.id AND t.deleted IS NULL))
          ORDER BY g.id, live."createdAt", live.id`;
        for (const { fromId, toId } of deletedGenerals) {
          summary.generalsRelinked += (
            await tx.card.updateMany({
              where: { defaultCardId: fromId, deleted: null },
              data: { defaultCardId: toId },
            })
          ).count;
        }
        await moveRows(deletedGenerals);

        const dupes = await tx.$queryRaw<{ defaultCardId: string }[]>`
          SELECT DISTINCT "defaultCardId" FROM card
          WHERE deleted IS NULL AND "budgetId" IS NOT NULL AND "defaultCardId" IS NOT NULL
          GROUP BY "budgetId", "defaultCardId" HAVING count(*) > 1`;
        summary.copiesFolded = await collapseBudgetCopies(
          tx,
          dupes.map((d) => d.defaultCardId),
        );

        const deletedCopies = await tx.$queryRaw<Move[]>`
          SELECT DISTINCT ON (k.id) k.id AS "fromId", s.id AS "toId"
          FROM card k
          JOIN budgets b ON b.id = k."budgetId" AND b.deleted IS NULL
          JOIN card s ON s."budgetId" = k."budgetId" AND s.deleted IS NULL AND s.id <> k.id
            AND (s."defaultCardId" = k."defaultCardId" OR (${sameCard("k", "s")}))
          WHERE k.deleted IS NOT NULL
            AND (EXISTS (SELECT 1 FROM transactions t WHERE t."cardId" = k.id AND t.deleted IS NULL)
              OR EXISTS (SELECT 1 FROM recurring_transactions r WHERE r."cardId" = k.id AND r.deleted IS NULL))
          ORDER BY k.id,
            CASE WHEN s."defaultCardId" = k."defaultCardId" THEN 0
                 WHEN s."defaultCardId" IS NULL OR k."defaultCardId" IS NULL THEN 1
                 ELSE 2 END,
            s."createdAt", s.id`;
        summary.deletedCopiesRehomed = deletedCopies.length;
        await moveRows(deletedCopies);

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

  if (Object.values(summary).every((n) => n === 0)) {
    console.log("Nothing to do: no duplicate or stranded cards.");
  } else {
    console.log(
      dryRun ? "Dry run: would change (nothing was changed):" : "Changed:",
    );
    console.table(summary);
  }

  if (lookalikes > 0) {
    console.log(
      `Left alone: ${lookalikes} group(s) of same-named cards on one budget that aren't copies of one general card. If they come from duplicate general cards, merge those on the Cards page to fold them.`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to repair duplicate cards:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
