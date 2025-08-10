import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { deleteCategory, updateCategory } from "@/lib/api-services/categories";
import { type CategoryType, type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { updateCategorySchema } from "@/lib/api-schemas/categories";
import { validateCategoryId } from "@/lib/utils/auth";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const { id } = await context.params;
    const categoryId = validateCategoryId(id);


    const body = await req.json() as { name: string; group: string };
    const validatedData = updateCategorySchema.parse(body);
    
    return await prisma.$transaction(async (tx) => {
      const updatedCategory = await updateCategory(tx, categoryId, {
        name: validatedData.name,
        group: validatedData.group as CategoryType,
      });

      return NextResponse.json(updatedCategory, { status: 200 });
    });
  }),
}); 


export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const { id } = await context.params;
    const categoryId = validateCategoryId(id);
    
    return await prisma.$transaction(async (tx) => {
      await deleteCategory(tx, categoryId);
      
      return NextResponse.json({ message: "Category deleted" }, { status: 200 });
    });
  }),
});