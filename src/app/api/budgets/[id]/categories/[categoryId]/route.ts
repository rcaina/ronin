import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateBudgetCategorySchema = z.object({
  allocatedAmount: z.number().positive("Allocated amount must be positive").optional(),
  categoryId: z.string().min(1, "Category ID is required").optional(),
  categoryName: z.string().min(1, "Category name is required").max(100, "Category name must be less than 100 characters").optional(),
});

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId, categoryId } = await context.params;
    
    if (!budgetId || !categoryId) {
      return NextResponse.json({ message: "Budget ID and Category ID are required" }, { status: 400 });
    }

    const body = await req.json() as unknown;
    const validationResult = updateBudgetCategorySchema.safeParse(body);
    
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

    // If updating categoryId, verify the new category exists
    if (validationResult.data.categoryId) {
      const newCategory = await prisma.category.findFirst({
        where: {
          id: validationResult.data.categoryId,
          deleted: null,
        },
      });

      if (!newCategory) {
        return NextResponse.json({ message: "Category not found" }, { status: 404 });
      }

      // Check if the new category is already added to this budget
      const existingBudgetCategory = await prisma.budgetCategory.findFirst({
        where: {
          budgetId: budgetId,
          categoryId: validationResult.data.categoryId,
          deleted: null,
        },
      });

      if (existingBudgetCategory) {
        return NextResponse.json({ message: "Category is already added to this budget" }, { status: 400 });
      }
    }

    // Update the budget category
    const updateData: {
      allocatedAmount?: number;
      categoryId?: string;
    } = {};
    if (validationResult.data.allocatedAmount !== undefined) {
      updateData.allocatedAmount = validationResult.data.allocatedAmount;
    }
    if (validationResult.data.categoryId) {
      updateData.categoryId = validationResult.data.categoryId;
    }

    // If updating category name, update the associated category template
    if (validationResult.data.categoryName) {
      const budgetCategory = await prisma.budgetCategory.findFirst({
        where: {
          id: categoryId,
          budgetId: budgetId,
          deleted: null,
        },
        include: {
          category: true,
        },
      });

      if (!budgetCategory) {
        return NextResponse.json({ message: "Budget category not found" }, { status: 404 });
      }

      // Update the category template name
      await prisma.category.update({
        where: {
          id: budgetCategory.categoryId,
        },
        data: {
          name: validationResult.data.categoryName,
        },
      });
    }

    const updatedBudgetCategory = await prisma.budgetCategory.update({
      where: {
        id: categoryId,
        budgetId: budgetId,
        deleted: null,
      },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: 'Budget category updated successfully', budgetCategory: updatedBudgetCategory },
      { status: 200 }
    );
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id: budgetId, categoryId } = await context.params;
    
    if (!budgetId || !categoryId) {
      return NextResponse.json({ message: "Budget ID and Category ID are required" }, { status: 400 });
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

    // Check if there are any transactions in this category
    const transactions = await prisma.transaction.findMany({
      where: {
        budgetId: budgetId,
        categoryId: categoryId,
        deleted: null,
      },
    });

    if (transactions.length > 0) {
      return NextResponse.json(
        { message: "Cannot delete category with existing transactions" },
        { status: 400 }
      );
    }

    // Soft delete the budget category
    await prisma.budgetCategory.update({
      where: {
        id: categoryId,
        budgetId: budgetId,
        deleted: null,
      },
      data: {
        deleted: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Budget category deleted successfully' },
      { status: 200 }
    );
  }),
}); 