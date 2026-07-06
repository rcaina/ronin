import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { verifyPasswordResetToken } from "@/server/auth/email-tokens";
import { EmailTokenPurpose } from "@prisma/client";

const INVALID_RESPONSE = {
  error: "Invalid or expired reset link",
};

export const POST = async (request: NextRequest) => {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    token?: unknown;
    password?: unknown;
  } | null;

  const email = body?.email;
  const token = body?.token;
  const password = body?.password;

  if (
    typeof email !== "string" ||
    typeof token !== "string" ||
    typeof password !== "string" ||
    !email ||
    !token
  ) {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const isValid = await verifyPasswordResetToken(email, token);
  if (!isValid) {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.emailToken.deleteMany({
      where: { email, purpose: EmailTokenPurpose.PASSWORD_RESET },
    }),
  ]);

  return NextResponse.json({ message: "Password updated" }, { status: 200 });
};
