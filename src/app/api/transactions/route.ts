import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { getTransactions, createTransaction } from "@/lib/api-services/transactions";
import { createTransactionSchema } from "@/lib/api-schemas/transactions";
import type { User } from "@prisma/client";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const transactions = await getTransactions(prisma, user.accountId);
    return NextResponse.json(transactions, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    const validationResult = createTransactionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    try {
      const transaction = await prisma.$transaction(async (tx) => 
        await createTransaction(tx, validationResult.data, user)
      );

      return NextResponse.json(
        { message: 'Transaction created successfully', transaction },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
      return NextResponse.json(
        { message: "Failed to create transaction" },
        { status: 500 }
      );
    }
  }),
}); 