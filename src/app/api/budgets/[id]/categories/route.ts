import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createBudgetCategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  group: z.enum(["needs", "wants", "investment"]),
  allocatedAmount: z.number().positive("Allocated amount must be positive"),
});

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Budget ID is required" }, { status: 400 });
    }

    const budgetCategories = await prisma.budgetCategory.findMany({
      where: {
        budgetId: id,
        deleted: null,
      },
      include: {
        category: true,
        transactions: {
          where: {
            deleted: null,
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        category: {
          name: 'asc',
        },
      },
    });

    // Calculate spent amount for each budget category
    const budgetCategoriesWithSpent = budgetCategories.map(budgetCategory => ({
      ...budgetCategory,
      spentAmount: budgetCategory.transactions?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0,
      transactions: undefined, // Remove transactions from response
    }));

    return NextResponse.json(budgetCategoriesWithSpent, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId } = await context.params;
    
    if (!budgetId) {
      return NextResponse.json({ message: "Budget ID is required" }, { status: 400 });
    }

    const body = await req.json() as unknown;
    const validationResult = createBudgetCategorySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Verify the budget belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        accountId: user.accountId,
        deleted: null,
      },
    });

    if (!budget) {
      return NextResponse.json({ message: "Budget not found" }, { status: 404 });
    }

    // Convert group to CategoryType enum
    const groupToCategoryType = {
      needs: "NEEDS" as const,
      wants: "WANTS" as const,
      investment: "INVESTMENT" as const,
    };

    const categoryType = groupToCategoryType[validationResult.data.group];

    try {
      // Create the category template first
      const category = await prisma.category.create({
        data: {
          name: validationResult.data.categoryName,
          group: categoryType,
        },
      });

      // Create the budget category
      const budgetCategory = await prisma.budgetCategory.create({
        data: {
          budgetId: budgetId,
          categoryId: category.id,
          allocatedAmount: validationResult.data.allocatedAmount,
        },
        include: {
          category: true,
        },
      });

      return NextResponse.json(
        { message: 'Budget category added successfully', budgetCategory },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating budget category:", error);
      return NextResponse.json(
        { message: "Failed to create budget category" },
        { status: 500 }
      );
    }
  }),
}); 