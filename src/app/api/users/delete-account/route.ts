import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { deleteUserAccount } from "@/lib/api-services/users";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as { password?: string };
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const result = await deleteUserAccount(tx, user, password);
      
      return NextResponse.json(result, { status: 200 });
    });
  }),
});
