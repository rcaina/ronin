import type { Role, PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

export interface CreateUserData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
}

export async function createUser(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateUserData,
  accountId: string
) {
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12)

  // Create the user
  const user = await tx.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
  })

  // Link user to the account
  await tx.accountUser.create({
    data: {
      userId: user.id,
      accountId,
    },
  })

  return user
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