import { authConfig } from "@/server/auth/config";
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
// import prisma from "@/lib/prisma";
// import * as bcrypt from "bcryptjs";
// import { type NextAuthConfig, type Session } from "next-auth";
// import Credentials from "next-auth/providers/credentials";
// import type { User, Role } from "@prisma/client";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import type { Adapter } from "next-auth/adapters";
// import type { JWT } from "next-auth/jwt";

// type UserAccount = Omit<User, 'role'> & {
//   role: Role;
//   account: {
//     id: string;
//     name: string;
//     type: string;
//   };
// };

// export const authOptions: NextAuthConfig = {
//   session: {
//     strategy: "jwt",
//   },
//   providers: [
//     Credentials({
//       name: "Sign in",
//       credentials: {
//         email: {
//           label: "Email",
//           type: "email",
//           placeholder: "example@example.com",
//         },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials): Promise<UserAccount | null> {
//         console.log({credentials});
//         if (!credentials?.email || !credentials.password || typeof credentials.email !== "string" || typeof credentials.password !== "string") {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: {
//             email: credentials.email,
//           },
//           include: {
//             account: true,
//           },
//         }) as UserAccount | null;

//         if (!user?.password) return null;

//         const isMatch = await bcrypt.compare(credentials.password, user.password);
//         if (!isMatch) return null;

//         return user;
//       },
//     }),
//   ],
//   secret: process.env.NEXTAUTH_SECRET,
//   adapter: PrismaAdapter(prisma) as Adapter,
//   callbacks: {
//     async jwt({ token }) {
//       let foundUser;

//       if (token) {
//         foundUser = await prisma.user.findUnique({
//           where: {
//             email: token.email!,
//           },
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             role: true,
//             image: true,
//             emailVerified: true,
//             deleted: true,
//             account: {
//               select: {
//                 id: true,
//                 name: true,
//               },
//             },
//           },
//         });
//       }

//       if (foundUser) {
//         token.user = foundUser;
//       }

//       return token;
//     },
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     async session({ session, token }: { session: Session, token: JWT }) {
//       if (session?.user) {
//         const user = await prisma.user.findFirst({
//           where: {
//             id: token.sub,
//           },
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             role: true,
//             image: true,
//             emailVerified: true,
//             deleted: true,
//             account: {
//               select: {
//                 id: true,
//                 name: true,
//               },
//             },
//           },
//         });

//         if (user) {
//           session.user = {
//             ...session.user,
//             id: user.id,
//             role: user.role!,
//             accountId: user.account.id,
//             emailVerified: user.emailVerified,
//             deleted: user.deleted,
//             image: user.image,
//           };
//         }
//       }

//       return session;
//     },
//   },  
//   pages: {
//     signIn: "/signin",
//     signOut: "/signout",
//   },
// };