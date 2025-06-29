import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { type Role } from "@prisma/client";
import { env } from "@/env";
import { db } from "@/server/db";
import { isEmailAllowed } from "@/lib/utils/auth";

export const runtime = "nodejs";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string | null;
      name: string;
      role: Role;
      accountId: string;
      emailVerified: Date | null;
      deleted: boolean;
      hasBudget: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string | null;
    name: string;
    role: Role;
    accountId: string;
    emailVerified: Date | null;
    deleted: boolean;
    hasBudget: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || 
            typeof credentials.email !== "string" || 
            typeof credentials.password !== "string") {
          return null;
        }

        // Check if email is allowed
        if (!isEmailAllowed(credentials.email)) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            accountUsers: {
              include: {
                account: true,
              },
            },
          },
        });

        if (!user?.password || !user.role || !user.accountUsers.length) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        // Use the first account the user belongs to
        const firstAccountUser = user.accountUsers[0];
        if (!firstAccountUser) {
          return null;
        }
        const account = firstAccountUser.account;

        // Check if user has any budgets
        const budgetCount = await db.budget.count({
          where: {
            accountId: account.id,
            deleted: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountId: account.id,
          emailVerified: user.emailVerified,
          deleted: user.deleted !== null,
          hasBudget: budgetCount > 0,
        };
      },
    }),
  ],
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email ?? null;
        token.name = user.name!;
        token.role = user.role;
        token.accountId = user.accountId;
        token.emailVerified = user.emailVerified;
        token.deleted = user.deleted;
        token.hasBudget = user.hasBudget;
      }
      
      // Always check the current budget count for the user
      if (token?.accountId) {
        try {
          const budgetCount = await db.budget.count({
            where: {
              accountId: token.accountId,
              deleted: null,
            },
          });
          token.hasBudget = budgetCount > 0;
          console.log('JWT Callback - Budget count updated:', { accountId: token.accountId, budgetCount, hasBudget: token.hasBudget });
        } catch (error) {
          console.error('Error checking budget count in JWT callback:', error);
          // Fallback to existing hasBudget value if database query fails
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Input:', { 
        hasToken: !!token,
        tokenHasBudget: token?.hasBudget,
        tokenAccountId: token?.accountId
      });
      
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email!;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.accountId = token.accountId;
        session.user.emailVerified = token.emailVerified;
        session.user.deleted = token.deleted;
        session.user.hasBudget = token.hasBudget;
        
        console.log('Session Callback - Session created:', { 
          userId: session.user.id, 
          email: session.user.email,
          hasBudget: session.user.hasBudget,
          accountId: session.user.accountId
        });
      } else {
        console.log('Session Callback - No token provided');
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
