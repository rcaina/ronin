/**
 * Hard-deletes accounts that have no active member left (every account_user
 * row is gone or points at a deactivated user), with all of their data, via
 * `deleteAccountData`. Accounts with a live Stripe subscription are skipped and
 * reported, so a paying customer is never dropped without cancelling first.
 * Each account runs in its own database transaction. A second run finds
 * nothing to delete.
 *
 * Usage:
 *   pnpm accounts:delete-orphaned --dry-run   (prints the accounts, changes nothing)
 *   pnpm accounts:delete-orphaned
 */
import { PrismaClient } from "@prisma/client";
import { deleteAccountData, LIVE_SUBSCRIPTION } from "@/lib/api-services/users";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const accounts = await prisma.account.findMany({
    where: { users: { none: { user: { deleted: null } } } },
    select: {
      id: true,
      subscriptionStatus: true,
      _count: {
        select: {
          budgets: true,
          transactions: true,
          recurringTransactions: true,
          savings: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (accounts.length === 0) {
    console.log("Nothing to delete: every account has an active member.");
    return;
  }

  console.log(
    `${dryRun ? "[dry run] " : ""}${accounts.length} account(s) with no active member:`,
  );
  console.table(
    accounts.map(({ id, subscriptionStatus, _count }) => ({
      account: id,
      subscription: subscriptionStatus ?? "none",
      budgets: _count.budgets,
      transactions: _count.transactions,
      recurring: _count.recurringTransactions,
      savings: _count.savings,
    })),
  );

  const deletable = accounts.filter(
    (account) =>
      !account.subscriptionStatus ||
      !LIVE_SUBSCRIPTION.includes(account.subscriptionStatus),
  );
  for (const account of accounts) {
    if (!deletable.includes(account)) {
      console.log(
        `Skipping ${account.id}: subscription is ${account.subscriptionStatus}; cancel it in Stripe first.`,
      );
    }
  }

  if (dryRun) {
    console.log(
      `\nDry run: would delete ${deletable.length} account(s); nothing was changed.`,
    );
    return;
  }

  for (const { id } of deletable) {
    try {
      await prisma.$transaction((tx) => deleteAccountData(tx, id, null), {
        timeout: 120_000,
      });
      console.log(`Deleted ${id}`);
    } catch (error) {
      process.exitCode = 1;
      console.error(`Account ${id} failed, left unchanged:`, error);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to delete orphaned accounts:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
