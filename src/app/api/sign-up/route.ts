import { type NextRequest, NextResponse } from "next/server";
import { createUserWithAccount } from "@/lib/api-services/auth";
import { signUpSchema } from "@/lib/api-schemas/auth";
import prisma from "@/lib/prisma";

//not withuser
export const POST = async (request: NextRequest) => {
    const body = await request.json() as unknown;
    
    // Validate request body
    const validationResult = signUpSchema.safeParse(body);
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
      const user = await createUserWithAccount(tx, validationResult.data);
      return NextResponse.json(user, { status: 201 });
    });
}
