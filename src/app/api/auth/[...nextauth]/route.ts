import { authConfig } from "@/server/auth/config";
import NextAuth from "next-auth";

export const runtime = "nodejs";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export const GET = handlers.GET;
export const POST = handlers.POST;