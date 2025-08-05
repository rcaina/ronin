import { z } from "zod"
import { Role } from "@prisma/client"

export const createUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(Object.values(Role) as [string, ...string[]]).default(Role.MEMBER),
})

export type CreateUserSchema = z.infer<typeof createUserSchema> 