import { authConfig } from "@/server/auth/config";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

export const runtime = "nodejs";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig as NextAuthConfig);

export const GET = handlers.GET;
export const POST = handlers.POST;