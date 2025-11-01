import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { deleteAllocation } from "@/lib/api-services/savings";
import { validateAllocationId } from "@/lib/utils/auth";

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const allocationId = validateAllocationId(id);


      return await prisma.$transaction(async (tx) => {
      const result = await deleteAllocation(tx, allocationId, user.accountId);
      
      return NextResponse.json(result, { status: 200 });
    });

  }),
});

