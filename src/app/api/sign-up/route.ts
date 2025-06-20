import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { Role } from "@prisma/client";

// Validation schema for sign-up request
const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignUpRequest = z.infer<typeof signUpSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SignUpRequest;
    
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

    const { firstName, lastName, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and account in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          role: Role.MEMBER, // Default role for new users
        },
      });

      // Create a default account for the user
      const account = await tx.account.create({
        data: {
          name: `${firstName}'s Account`,
        },
      });

      // Link user to account
      await tx.accountUser.create({
        data: {
          userId: user.id,
          accountId: account.id,
        },
      });

      return { user, account };
    });

    // Return success response (don't include password)
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
