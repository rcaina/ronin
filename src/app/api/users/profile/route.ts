import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { updateUserProfile } from "@/lib/api-services/users";
import { updateProfileSchema } from "@/lib/api-schemas/users";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    
    const validationResult = updateProfileSchema.safeParse(body);
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
      const updatedUser = await updateUserProfile(tx, validationResult.data, user);

      return NextResponse.json(updatedUser, { status: 200 });
    });
  }),
});
