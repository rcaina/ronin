import type { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    id: string;
    role: Role;
    accountId: string;
    emailVerified: Date | null;
    deleted: boolean;
    account: {
      id: string;
      name: string;
    };
  }

  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: User;
  }
}
