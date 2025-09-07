import { Role, type PrismaClient, type User } from "@prisma/client"
import bcrypt from "bcryptjs"
import type { PrismaClientTx } from "../prisma"
import type { z } from "zod"
import type { createUserSchema, updateProfileSchema } from "../api-schemas/users"
import { NextResponse } from "next/server"

export interface CreateUserData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
}

export async function createUser(
  tx: PrismaClientTx,
  data: z.infer<typeof createUserSchema>,
  user: User & { accountId: string }
) {
  // Check if user is admin
  if (user.role !== Role.ADMIN) {
    return NextResponse.json(
      { message: "Only administrators can create users" },
      { status: 403 }
    );
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(tx, data.email);

  if (existingUser) {
    throw new Error("User with this email already exists")
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12)

  // Create the user
  const createdUser = await tx.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: hashedPassword,
      role: data.role as Role,
    },
  })

  // Link user to the account
  await tx.accountUser.create({
    data: {
      userId: user.id,
      accountId: user.accountId,
    },
  })

  return createdUser
}

export async function getAccountUsers(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  accountId: string
) {
  const accountUsers = await tx.accountUser.findMany({
    where: {
      accountId,
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
  })

  return accountUsers.map(au => au.user)
}

export async function findUserByEmail(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  email: string
) {
  return await tx.user.findUnique({
    where: { email },
  })
}

export async function deleteUserAccount(
  tx: PrismaClientTx,
  user: User & { accountId: string },
  password: string
) {
  // Get the account to check if user is the only user
  const account = await tx.account.findUnique({
    where: { id: user.accountId },
    include: {
      users: true,
    },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Verify user password
  const verifiedUser = await bcrypt.compare(password, user.password ?? "");

  if (!verifiedUser) {
    throw new Error('Invalid password');
  }

  // Check if this is the only user in the account
  const isAdmin = user.role === Role.ADMIN;

  if (isAdmin) {
    // If this is the only user, delete the entire account and all related data
    await tx.transaction.deleteMany({
      where: { accountId: user.accountId },
    });

    await tx.income.deleteMany({
      where: { accountId: user.accountId },
    });

    await tx.budgetCategory.deleteMany({
      where: {
        budget: {
          accountId: user.accountId,
        },
      },
    });

    await tx.budget.deleteMany({
      where: { accountId: user.accountId },
    });

    await tx.card.deleteMany({
      where: { userId: user.id },
    });

    await tx.accountUser.deleteMany({
      where: { accountId: user.accountId },
    });

    await tx.account.delete({
      where: { id: user.accountId },
    });

    await tx.user.delete({
      where: { id: user.id },
    });
  } else {
    // If there are other users, only delete this user's data
    // Delete user's transactions
    await tx.transaction.deleteMany({
      where: { userId: user.id },
    });

    // Delete user's income
    await tx.income.deleteMany({
      where: { userId: user.id },
    });

    // Delete user's cards
    await tx.card.deleteMany({
      where: { userId: user.id },
    });

    // Remove user from account
    await tx.accountUser.deleteMany({
      where: {
        accountId: user.accountId,
        userId: user.id,
      },
    });

    // Delete the user
    await tx.user.delete({
      where: { id: user.id },
    });
  }

  return {
    message: 'Account deleted successfully',
    deletedEntireAccount: isAdmin,
  };
}

export async function updateUserProfile(
  tx: PrismaClientTx,
  data: z.infer<typeof updateProfileSchema>,
  user: User & { accountId: string }
) {
  // Check if email is being updated and if it already exists
  if (data.email && data.email !== user.email) {
    const existingUser = await findUserByEmail(tx, data.email);
    if (existingUser && existingUser.id !== user.id) {
      throw new Error("Email already exists");
    }
  }

  // Prepare update data
  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
  } = {};

  if (data.name) {
    updateData.name = data.name;
  }
  if (data.email) {
    updateData.email = data.email;
  }
  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }

  // Update the user profile
  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return updatedUser;
} 