/**
 * Gives each account its own template categories. Per account, every legacy
 * template (no accountId) that a live budget category of the account links to
 * is matched to the account's template with the same group and name (case
 * ignored), or one is created, and the account's budget categories are
 * repointed to it. Legacy templates nothing live links to any more are then
 * soft-deleted. Each account runs in its own database transaction. A second
 * run finds nothing to do.
 *
 * Usage:
 *   pnpm categories:scope-templates --dry-run   (prints the summary, changes nothing)
 *   pnpm categories:scope-templates
 */
import { type CategoryType, PrismaClient } from "@prisma/client";
import { accountTemplates } from "@/lib/api-services/categories";

const prisma = new PrismaClient();

const legacyTemplate = {
  accountId: null,
  budgetId: null,
  defaultCategoryId: null,
  deleted: null,
};
const liveCopy = { deleted: null, budget: { deleted: null } };
const keyOf = (group: CategoryType, name: string) =>
  `${group}:${name.toLowerCase()}`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const copies = await prisma.category.findMany({
    where: { ...liveCopy, defaultCategory: legacyTemplate },
    select: {
      id: true,
      budget: { select: { accountId: true } },
      defaultCategory: { select: { id: true, name: true, group: true } },
    },
  });

  const copiesByAccount = new Map<string, typeof copies>();
  for (const copy of copies) {
    const accountId = copy.budget!.accountId;
    copiesByAccount.set(accountId, [
      ...(copiesByAccount.get(accountId) ?? []),
      copy,
    ]);
  }

  const summary = [];
  for (const [accountId, accountCopies] of copiesByAccount) {
    const counts = await prisma.$transaction(async (tx) => {
      const templateIdByKey = new Map(
        (
          await tx.category.findMany({ where: accountTemplates(accountId) })
        ).map((template) => [
          keyOf(template.group, template.name),
          template.id,
        ]),
      );
      const legacyTemplates = new Map(
        accountCopies.map((copy) => [
          copy.defaultCategory!.id,
          copy.defaultCategory!,
        ]),
      );

      let created = 0;
      for (const legacy of legacyTemplates.values()) {
        const key = keyOf(legacy.group, legacy.name);
        let templateId = templateIdByKey.get(key);
        if (!templateId) {
          created++;
          templateId = dryRun
            ? key
            : (
                await tx.category.create({
                  data: { name: legacy.name, group: legacy.group, accountId },
                })
              ).id;
          templateIdByKey.set(key, templateId);
        }
        if (!dryRun) {
          await tx.category.updateMany({
            where: {
              id: {
                in: accountCopies
                  .filter((copy) => copy.defaultCategory!.id === legacy.id)
                  .map((copy) => copy.id),
              },
            },
            data: { defaultCategoryId: templateId },
          });
        }
      }

      return {
        account: accountId,
        legacyLinked: legacyTemplates.size,
        reused: legacyTemplates.size - created,
        created,
        repointed: accountCopies.length,
      };
    });
    summary.push(counts);
  }

  // Every live copy of a legacy template was repointed above, so all of them are unlinked now.
  const toSoftDelete = await prisma.category.count({ where: legacyTemplate });

  const directRefs = { category: legacyTemplate };
  const [transactions, splits, recurring] = await Promise.all([
    prisma.transaction.count({ where: directRefs }),
    prisma.transactionSplit.count({ where: directRefs }),
    prisma.recurringTransaction.count({ where: directRefs }),
  ]);

  if (summary.length === 0 && toSoftDelete === 0) {
    console.log(
      "Nothing to do: every template category belongs to an account.",
    );
  } else {
    console.log(
      `${dryRun ? "[dry run] " : ""}${summary.length} account(s) linked to legacy templates:`,
    );
    if (summary.length > 0) console.table(summary);
  }
  console.log(
    `Legacy templates referenced directly (left alone): ${transactions} transaction(s), ${splits} split leg(s), ${recurring} recurring template(s).`,
  );

  if (dryRun) {
    console.log(
      `\nDry run: would soft-delete ${toSoftDelete} legacy template(s); nothing was changed.`,
    );
    return;
  }

  const { count } = await prisma.category.updateMany({
    where: { ...legacyTemplate, budgetCategories: { none: liveCopy } },
    data: { deleted: new Date() },
  });
  console.log(`Soft-deleted ${count} legacy template(s).`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to scope template categories:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
