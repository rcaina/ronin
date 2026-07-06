import crypto from "node:crypto";
import { EmailTokenPurpose } from "@prisma/client";
import { db } from "@/server/db";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const THROTTLE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_LOGIN_CODE_ATTEMPTS = 5;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * True if a token/code was already requested for this email+purpose within
 * the throttle window. Callers should still respond with a generic 200 when
 * throttled — they just skip sending a new email.
 */
export async function isThrottled(
  email: string,
  purpose: EmailTokenPurpose,
): Promise<boolean> {
  const mostRecent = await db.emailToken.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (!mostRecent) {
    return false;
  }

  return Date.now() - mostRecent.createdAt.getTime() < THROTTLE_WINDOW_MS;
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  await db.emailToken.upsert({
    where: {
      email_purpose: { email, purpose: EmailTokenPurpose.PASSWORD_RESET },
    },
    update: {
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      attempts: 0,
      // isThrottled() reads createdAt to enforce the 1-minute resend throttle.
      createdAt: new Date(),
    },
    create: {
      email,
      tokenHash: hashToken(token),
      purpose: EmailTokenPurpose.PASSWORD_RESET,
      expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  return token;
}

export async function createLoginCode(email: string): Promise<string> {
  const code = crypto.randomInt(100000, 1000000).toString();

  await db.emailToken.upsert({
    where: {
      email_purpose: { email, purpose: EmailTokenPurpose.LOGIN_CODE },
    },
    update: {
      tokenHash: hashToken(code),
      expires: new Date(Date.now() + LOGIN_CODE_TTL_MS),
      attempts: 0,
      // isThrottled() reads createdAt to enforce the 1-minute resend throttle.
      createdAt: new Date(),
    },
    create: {
      email,
      tokenHash: hashToken(code),
      purpose: EmailTokenPurpose.LOGIN_CODE,
      expires: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    },
  });

  return code;
}

export async function verifyPasswordResetToken(
  email: string,
  token: string,
): Promise<boolean> {
  const row = await db.emailToken.findUnique({
    where: {
      email_purpose: { email, purpose: EmailTokenPurpose.PASSWORD_RESET },
    },
  });

  if (!row || row.expires < new Date()) {
    return false;
  }

  return row.tokenHash === hashToken(token);
}

export async function consumeLoginCode(
  email: string,
  code: string,
): Promise<boolean> {
  const row = await db.emailToken.findUnique({
    where: {
      email_purpose: { email, purpose: EmailTokenPurpose.LOGIN_CODE },
    },
  });

  if (!row || row.expires < new Date()) {
    return false;
  }

  // Atomic guarded increment: concurrent submits can't lose attempt counts
  // or exceed the cap.
  const attempted = await db.emailToken.updateMany({
    where: { id: row.id, attempts: { lt: MAX_LOGIN_CODE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });

  if (attempted.count === 0) {
    return false;
  }

  if (row.tokenHash !== hashToken(code)) {
    return false;
  }

  // deleteMany is idempotent — a concurrent duplicate submit that lost the
  // race gets count 0 and fails instead of throwing P2025.
  const deleted = await db.emailToken.deleteMany({ where: { id: row.id } });

  return deleted.count === 1;
}
