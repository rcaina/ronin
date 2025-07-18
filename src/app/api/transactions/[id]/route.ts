import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { deleteTransaction, updateTransaction } from "@/lib/api-services/transactions";
import { updateTransactionSchema } from "@/lib/api-schemas/transactions";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }
    
    const body = await req.json() as unknown;
    const validationResult = updateTransactionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    try {
      const transaction = await prisma.$transaction(async (tx) => 
        await updateTransaction(tx, id, validationResult.data, user)
      );

      return NextResponse.json(
        { message: 'Transaction updated successfully', transaction },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating transaction:", error);
      return NextResponse.json(
        { message: "Failed to update transaction" },
        { status: 500 }
      );
    }
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }
    
    return await prisma.$transaction(async (tx) => {
      await deleteTransaction(tx, id, user);
      return NextResponse.json({ message: "Transaction deleted" }, { status: 200 });
    });
  }),
}); 