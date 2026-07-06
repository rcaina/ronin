import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isEmailAllowed } from "@/lib/utils/auth";
import {
  createPasswordResetToken,
  isThrottled,
} from "@/server/auth/email-tokens";
import { sendPasswordResetEmail } from "@/server/email";
import { EmailTokenPurpose } from "@prisma/client";

const GENERIC_MESSAGE = {
  message: "If an account exists for that email, a reset link has been sent.",
};

// Never leaks whether an account exists — always responds 200 with a
// generic message, regardless of the outcome.
export const POST = async (request: NextRequest) => {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email = body?.email;

  if (typeof email !== "string" || !email) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  if (!isEmailAllowed(email)) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.password || user.deleted) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  if (await isThrottled(email, EmailTokenPurpose.PASSWORD_RESET)) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  const token = await createPasswordResetToken(email);
  const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // A send failure must not change the response — a non-200 here would only
  // ever happen for existing accounts, leaking whether the email is registered.
  try {
    await sendPasswordResetEmail(email, resetUrl, request.nextUrl.origin);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }

  return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
};
