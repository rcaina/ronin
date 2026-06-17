import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { importBudgetCategoriesSchema } from "@/lib/api-schemas/budget-categories";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";
import { importBudgetCategories } from "@/lib/api-services/budgets";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const budgetId = validateBudgetId(id);
      await ensureBudgetOwnership(budgetId, user.accountId);

      const body = (await req.json()) as unknown;
      const validationResult = importBudgetCategoriesSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const { sourceBudgetId, categoryIds } = validationResult.data;
      await ensureBudgetOwnership(sourceBudgetId, user.accountId);

      return await prisma.$transaction(async (tx) => {
        const result = await importBudgetCategories(
          tx,
          budgetId,
          sourceBudgetId,
          categoryIds,
          user,
        );
        return NextResponse.json(
          {
            imported: result.created.length,
            skipped: result.skipped,
            categories: result.created,
          },
          { status: 201 },
        );
      });
    },
  ),
});
