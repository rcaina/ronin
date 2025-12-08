import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { getCategories, createCategory } from "@/lib/api-services/categories"
import { type User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"
import { createCategorySchema } from "@/lib/api-schemas/categories"
import { HttpError } from "@/lib/errors"

export const GET = withUser({
    GET: withUserErrorHandling(async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
      return await prisma.$transaction(async (tx) => {
        const categories = await getCategories(tx)

        // Ensure all category groups are present as arrays, even if empty
        const response = {
          needs: categories.needs || [],
          wants: categories.wants || [],
          investment: categories.investment || [],
        }

        return NextResponse.json(response, { status: 200 })
      })
    }),
})

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    const validationResult = createCategorySchema.safeParse(body);

    if (!validationResult.success) {
      throw new HttpError("Validation failed", 400, validationResult.error);
    }

    return await prisma.$transaction(async (tx) => {
      const category = await createCategory(tx, validationResult.data);
      
      return NextResponse.json(category, { status: 201 });
    });
  }),
}) 