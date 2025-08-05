import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { getCategories, createCategory } from "@/lib/api-services/categories"
import { CategoryType, type User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  group: z.enum(Object.values(CategoryType) as [string, ...string[]]),
});

export const GET = withUser({
    GET: withUserErrorHandling(async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
        const categories = await getCategories(prisma)
        return NextResponse.json(categories, { status: 200 })
    }),
})

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    
    // Validate request body
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, group } = validationResult.data;
    
    return await prisma.$transaction(async (tx) => {
      const category = await createCategory(tx, {
        name,
        group: group as CategoryType,
      });
      return NextResponse.json(category, { status: 201 });
    });
  }),
}) 