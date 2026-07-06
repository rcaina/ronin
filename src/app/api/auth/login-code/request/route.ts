import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import prisma from "@/lib/prisma";
import { isEmailAllowed } from "@/lib/utils/auth";
import { createLoginCode, isThrottled } from "@/server/auth/email-tokens";
import { sendLoginCodeEmail } from "@/server/email";
import { EmailTokenPurpose } from "@prisma/client";

const GENERIC_MESSAGE = {
  message: "If an account exists for that email, a sign-in code has been sent.",
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

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accountUsers: true },
  });

  if (!user?.password || user.deleted || !user.accountUsers.length) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  if (await isThrottled(email, EmailTokenPurpose.LOGIN_CODE)) {
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }

  const code = await createLoginCode(email);
  // APP_URL is required in production; the request-origin fallback is dev-only
  // so reset links can't be poisoned via the Host header.
  const origin = env.APP_URL ?? request.nextUrl.origin;

  // A send failure must not change the response — a non-200 here would only
  // ever happen for existing accounts, leaking whether the email is registered.
  try {
    await sendLoginCodeEmail(email, code, origin);
  } catch (error) {
    console.error("Failed to send login code email:", error);
  }

  return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
};
