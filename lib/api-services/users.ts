import { Role, type PrismaClient, type User } from "@prisma/client"
import bcrypt from "bcryptjs"
import type { PrismaClientTx } from "../prisma"
import type { z } from "zod"
import type { createUserSchema } from "../api-schemas/users"
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