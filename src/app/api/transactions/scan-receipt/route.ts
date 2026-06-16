import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { ensureBudgetOwnership } from "@/lib/utils/auth";
import { scanReceipt } from "@/lib/api-services/receipts";
import { scanReceiptSchema } from "@/lib/api-schemas/receipt";
import type { User } from "@prisma/client";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = scanReceiptSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const { budgetId, imageBase64, mediaType } = validationResult.data;
      await ensureBudgetOwnership(budgetId, user.accountId);

      const result = await scanReceipt(prisma, budgetId, {
        imageBase64,
        mediaType,
      });

      return NextResponse.json(result, { status: 200 });
    },
  ),
});
