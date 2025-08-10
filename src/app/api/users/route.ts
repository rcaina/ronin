import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createUser, getAccountUsers } from "@/lib/api-services/users";
import { createUserSchema } from "@/lib/api-schemas/users";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    return await prisma.$transaction(async (tx) => {
      const users = await getAccountUsers(tx, user.accountId);

      return NextResponse.json(users, { status: 200 });
    });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const newUser = await createUser(tx, validationResult.data, user);

      return NextResponse.json(newUser, { status: 201 });
    });
  }),
}); 