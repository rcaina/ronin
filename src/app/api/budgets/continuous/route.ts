import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { getOrCreateContinuousBudget } from "@/lib/api-services/budgets";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const budget = await getOrCreateContinuousBudget(prisma, user);
      return NextResponse.json(budget, { status: 200 });
    },
  ),
});
