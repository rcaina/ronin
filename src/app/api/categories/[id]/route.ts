import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { deleteCategory, updateCategory } from "@/lib/api-services/categories";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  group: z.enum(["WANTS", "NEEDS", "INVESTMENT"]),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Category ID is required" }, { status: 400 });
    }
    
    return await prisma.$transaction(async (tx) => {
      await deleteCategory(tx, id);
      return NextResponse.json({ message: "Category deleted" }, { status: 200 });
    });
  }),
});

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, _user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Category ID is required" }, { status: 400 });
    }

    const body = await req.json() as { name: string; group: string };
    const validatedData = updateCategorySchema.parse(body);
    
    return await prisma.$transaction(async (tx) => {
      const updatedCategory = await updateCategory(tx, id, validatedData);
      return NextResponse.json(updatedCategory, { status: 200 });
    });
  }),
}); 