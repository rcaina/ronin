import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { getSavingsById } from "@/lib/api-services/savings";
import { ensureSavingsAccountOwnership, validateSavingsId } from "@/lib/utils/auth";

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const savingsId = validateSavingsId(id);
    await ensureSavingsAccountOwnership(savingsId, user.accountId);

    return await prisma.$transaction(async (tx) => {
      const savings = await getSavingsById(tx, savingsId, user.accountId);

      return NextResponse.json(savings, { status: 200 });
    })

  }),
});

