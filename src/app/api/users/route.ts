import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createUser, getAccountUsers, findUserByEmail } from "@/lib/api-services/users";
import { createUserSchema } from "@/lib/api-schemas/users";
import { type User, Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const users = await getAccountUsers(prisma, user.accountId);
    return NextResponse.json(users, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    // Check if user is admin
    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Only administrators can create users" },
        { status: 403 }
      );
    }

    const body = await req.json() as unknown;
    
    // Validate request body
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

    const { firstName, lastName, email, password, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(prisma, email);

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    try {
      const newUser = await prisma.$transaction(async (tx) => 
        await createUser(tx, { firstName, lastName, email, password, role: role as Role }, user.accountId)
      );

      // Return success response without password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = newUser;
      
      return NextResponse.json(
        { 
          message: "User created successfully",
          user: userWithoutPassword,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { message: "Failed to create user" },
        { status: 500 }
      );
    }
  }),
}); 