import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { updatePocketSchema } from "@/lib/api-schemas/savings";
import { updatePocket, deletePocket, getPocketById } from "@/lib/api-services/savings";
import { toPocketSummary } from "@/lib/transformers/savings";
import { HttpError } from "@/lib/errors";
import { ensurePocketOwnership, validatePocketId } from "@/lib/utils/auth";

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const pocketId = validatePocketId(id);
    
    return await prisma.$transaction(async (tx) => {
      const pocket = await getPocketById(tx, pocketId, user.accountId);
      
      if (!pocket) {
        throw new HttpError("Pocket not found", 404);
      }
      
      return NextResponse.json(toPocketSummary(pocket), { status: 200 });
    });
  }),
});

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const pocketId = validatePocketId(id);
    await ensurePocketOwnership(pocketId, user.accountId);
    
    const body = await req.json() as unknown;
    const validationResult = updatePocketSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const pocket = await updatePocket(tx, pocketId, validationResult.data, user.accountId);

      if (!pocket) {
        return NextResponse.json({ message: "Pocket not found" }, { status: 404 });
      }

      return NextResponse.json(toPocketSummary(pocket), { status: 200 });
    });
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const pocketId = validatePocketId(id);
    await ensurePocketOwnership(pocketId, user.accountId);

    return await prisma.$transaction(async (tx) => {
      const result = await deletePocket(tx, pocketId, user.accountId);
      
      return NextResponse.json(result, { status: 200 });
    });
  }),
});

