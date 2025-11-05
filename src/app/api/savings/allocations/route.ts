import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { createAllocationSchema } from "@/lib/api-schemas/savings";
import { createAllocation } from "@/lib/api-services/savings";
import { toAllocationSummary } from "@/lib/transformers/savings";

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    const validationResult = createAllocationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error?.errors ?? [] },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      try {
        const allocation = await createAllocation(tx, validationResult.data, user.accountId, user);
        
        if (!allocation) {
          return NextResponse.json({ message: "Pocket not found" }, { status: 404 });
        }

        return NextResponse.json(toAllocationSummary(allocation), { status: 201 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create allocation";
        return NextResponse.json({ message: errorMessage }, { status: 400 });
      }
    });
  }),
});

