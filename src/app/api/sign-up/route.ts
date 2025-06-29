import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createUserWithAccount, findUserByEmail } from "@/lib/api-services/auth";
import { signUpSchema } from "@/lib/api-schemas/auth";
import { isEmailAllowed } from "@/lib/utils/auth";

export async function POST(request: NextRequest) {
  try {
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

    const { email } = validationResult.data;

    // Check if email is allowed
    if (!isEmailAllowed(email)) {
      return NextResponse.json(
        { message: "Email not allowed for registration" },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(db, email);

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create user and account in a transaction
    const result = await db.$transaction(async (tx) => 
      await createUserWithAccount(tx, validationResult.data)
    );

    // Return success response (don't include password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = result.user;
    
    return NextResponse.json(
      { 
        message: "User created successfully",
        user: userWithoutPassword,
        account: result.account
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Sign-up error:", error);
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
