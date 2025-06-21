import { Role, type PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

export interface CreateUserData {
  firstName: string
  lastName: string
  email: string
  password: string
}

export async function createUserWithAccount(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateUserData
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
      role: Role.ADMIN, // Default role for new users
    },
  })

  // Create a default account for the user
  const account = await tx.account.create({
    data: {
      name: `${data.firstName}'s Account`,
    },
  })

  // Link user to account
  await tx.accountUser.create({
    data: {
      userId: user.id,
      accountId: account.id,
    },
  })

  return { user, account }
}

export async function findUserByEmail(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  email: string
) {
  return await tx.user.findUnique({
    where: { email },
  })
} 