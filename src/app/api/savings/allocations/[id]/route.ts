import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { updateAllocation, deleteAllocation } from "@/lib/api-services/savings";
import { validateAllocationId } from "@/lib/utils/auth";
import { updateAllocationSchema } from "@/lib/api-schemas/savings";
import { toAllocationSummary } from "@/lib/transformers/savings";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const allocationId = validateAllocationId(id);
    const body = await req.json() as unknown;
    const validationResult = updateAllocationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error?.errors ?? [] },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      try {
        const allocation = await updateAllocation(tx, allocationId, validationResult.data, user.accountId);
        
        if (!allocation) {
          return NextResponse.json({ message: "Allocation not found" }, { status: 404 });
        }

        return NextResponse.json(toAllocationSummary(allocation), { status: 200 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update allocation";
        return NextResponse.json({ message: errorMessage }, { status: 400 });
      }
    });
  }),
});

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

