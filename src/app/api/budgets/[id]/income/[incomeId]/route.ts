import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { updateIncome, deleteIncome } from "@/lib/api-services/income";
import { updateSingleIncomeSchema } from "@/lib/api-schemas/income";
import type { User } from "@prisma/client";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId, incomeId } = await context.params;
    
    if (!budgetId || !incomeId) {
      return NextResponse.json(
        { message: "Budget ID and Income ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json() as unknown;
    const validationResult = updateSingleIncomeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Verify the budget exists and belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        accountId: user.accountId,
        deleted: null,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    try {
      const income = await prisma.$transaction(async (tx) => 
        await updateIncome(tx, incomeId, budgetId, validationResult.data, user)
      );

      return NextResponse.json(
        { message: 'Income updated successfully', income },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating income:", error);
      return NextResponse.json(
        { message: "Failed to update income" },
        { status: 500 }
      );
    }
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId, incomeId } = await context.params;
    
    if (!budgetId || !incomeId) {
      return NextResponse.json(
        { message: "Budget ID and Income ID are required" },
        { status: 400 }
      );
    }

    // Verify the budget exists and belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        accountId: user.accountId,
        deleted: null,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => 
        await deleteIncome(tx, incomeId, budgetId, user)
      );

      return NextResponse.json(
        { message: 'Income deleted successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting income:", error);
      return NextResponse.json(
        { message: "Failed to delete income" },
        { status: 500 }
      );
    }
  }),
}); 