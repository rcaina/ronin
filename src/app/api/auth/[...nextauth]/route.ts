import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

export const runtime = "nodejs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Credentials({
        credentials: {
          email: {
            type: "email",
            label: "Email",
            placeholder: "johndoe@gmail.com",
          },
          password: {
            type: "password",
            label: "Password",
            placeholder: "*****",
          },
        }, authorize: async (credentials) => {
            console.log(credentials)
            if (!credentials?.email || !credentials.password || typeof credentials.email !== "string" || typeof credentials.password !== "string") {
                return null;
              }
      
              const user = await prisma.user.findUnique({
                where: {
                  email: credentials.email,
                },
                include: {
                  account: true,
                },
              }) as User | null;
      
              if (!user?.password || !user.role) return null;
      
              const isMatch = await bcrypt.compare(credentials.password, user.password);
              if (!isMatch) return null;
      
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accountId: user.accountId,
                emailVerified: user.emailVerified,
                deleted: user.deleted,
                firstName: user.firstName,
                lastName: user.lastName,
                password: user.password,
                phone: user.phone,
                image: user.image,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                account: {
                  id: user.accountId,
                  name: user.name,
                }
              };
          },
      }),
      
  ],
})

export const GET = handlers.GET
export const POST = handlers.POST