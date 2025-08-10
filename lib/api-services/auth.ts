import { Role } from "@prisma/client"
import type { PrismaClientTx } from "../prisma"
import bcrypt from "bcryptjs"
import { isEmailAllowed } from "../utils/auth"
import type { z } from "zod"
import type { signUpSchema } from "../api-schemas/auth"

export async function createUserWithAccount(
  tx: PrismaClientTx,
  data: z.infer<typeof signUpSchema>
) {

  if(!isEmailAllowed(data.email)) {
    throw new Error("Email not allowed for sign up")
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(tx, data.email);

  if (existingUser) {
    throw new Error("User with this email already exists")
  }

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


  return {...user, password: undefined};
}

export async function findUserByEmail(
  tx: PrismaClientTx,
  email: string
) {
  return await tx.user.findUnique({
    where: { email },
  })
} 