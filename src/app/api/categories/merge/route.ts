import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { mergeCategories } from "@/lib/api-services/categories";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { mergeCategoriesSchema } from "@/lib/api-schemas/categories";
import { HttpError } from "@/lib/errors";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      _user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = mergeCategoriesSchema.safeParse(body);

      if (!validationResult.success) {
        throw new HttpError("Validation failed", 400, validationResult.error);
      }

      return await prisma.$transaction(async (tx) => {
        const category = await mergeCategories(tx, validationResult.data);

        return NextResponse.json(category, { status: 200 });
      });
    },
  ),
});
