import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User, Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(Object.values(Role) as [string, ...string[]]).default("MEMBER"),
});

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, _context, user: User & { accountId: string }) => {
    const accountUsers = await prisma.accountUser.findMany({
      where: {
        accountId: user.accountId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const users = accountUsers.map(au => au.user);
    return NextResponse.json(users, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context, user: User & { accountId: string }) => {
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

    const { firstName, lastName, email, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate a default password (you can customize this)
    const defaultPassword = "Welcome123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role: role as Role,
      },
    });

    // Link user to the current account
    await prisma.accountUser.create({
      data: {
        userId: newUser.id,
        accountId: user.accountId,
      },
    });

    // Return success response with the default password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      { 
        message: "User created successfully",
        user: userWithoutPassword,
        defaultPassword,
      },
      { status: 201 }
    );
  }),
}); 