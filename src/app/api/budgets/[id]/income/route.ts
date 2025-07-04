import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { updateBudgetIncome, createIncome } from "@/lib/api-services/income";
import { updateIncomeSchema, createIncomeSchema } from "@/lib/api-schemas/income";
import type { User } from "@prisma/client";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId } = await context.params;
    
    if (!budgetId) {
      return NextResponse.json(
        { message: "Budget ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json() as unknown;
    const validationResult = updateIncomeSchema.safeParse(body);
    
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
      const result = await prisma.$transaction(async (tx) => 
        await updateBudgetIncome(tx, budgetId, validationResult.data, user)
      );

      return NextResponse.json(
        { 
          message: 'Income updated successfully', 
          result: {
            deleted: result.deleted,
            updated: result.updated.length,
            created: result.created.length,
          }
        },
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

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId } = await context.params;
    
    if (!budgetId) {
      return NextResponse.json(
        { message: "Budget ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json() as unknown;
    const validationResult = createIncomeSchema.safeParse(body);
    
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
        await createIncome(tx, budgetId, validationResult.data, user)
      );

      return NextResponse.json(
        { message: 'Income created successfully', income },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating income:", error);
      return NextResponse.json(
        { message: "Failed to create income" },
        { status: 500 }
      );
    }
  }),
}); 