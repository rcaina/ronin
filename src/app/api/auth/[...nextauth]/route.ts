import { authConfig } from "@/server/auth/config";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

export const runtime = "nodejs";

const { handlers } = NextAuth(authConfig as NextAuthConfig);

export const GET = handlers.GET;
export const POST = handlers.POST;