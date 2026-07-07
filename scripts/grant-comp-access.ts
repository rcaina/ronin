/**
 * Grant (or revoke) complimentary access for a user's account(s).
 *
 * Complimentary access bypasses every plan/entitlement gate (see
 * `lib/utils/entitlements.ts`) and is never touched by Stripe webhook sync,
 * so it's safe for comping friends, family, and support cases without
 * worrying about a subscription event clobbering the flag.
 *
 * Usage:
 *   pnpm comp:grant <email>
 *   pnpm comp:revoke <email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((arg) => !arg.startsWith("--"));

  if (!email) {
    console.error(
      "Usage: pnpm comp:grant <email>   (or pnpm comp:revoke <email>)",
    );
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exitCode = 1;
    return;
  }

  const accountUsers = await prisma.accountUser.findMany({
    where: { userId: user.id },
    include: { account: { select: { id: true, name: true } } },
  });

  if (accountUsers.length === 0) {
    console.error(
      `User "${user.email}" (${user.name}) isn't linked to any account.`,
    );
    process.exitCode = 1;
    return;
  }

  if (accountUsers.length > 1) {
    console.log(
      `User "${user.email}" belongs to ${accountUsers.length} accounts — updating all of them:`,
    );
    for (const { account } of accountUsers) {
      console.log(`  - ${account.name} (${account.id})`);
    }
  }

  const accountIds = accountUsers.map(({ account }) => account.id);

  await prisma.account.updateMany({
    where: { id: { in: accountIds } },
    data: { complimentaryAccess: !revoke },
  });

  const action = revoke ? "Revoked" : "Granted";
  for (const { account } of accountUsers) {
    console.log(
      `${action} complimentary access for account "${account.name}" (${account.id}).`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to update complimentary access:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
