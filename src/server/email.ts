import { Resend } from "resend";
import { env } from "@/env";

/**
 * Thin wrapper around the Resend SDK for the two transactional emails Ronin
 * sends: password reset links and sign-in codes.
 *
 * The Resend client is instantiated lazily so importing this module never
 * throws when RESEND_API_KEY is unset (e.g. in dev, or in builds that don't
 * need email).
 */

let resendClient: Resend | undefined;

function getResendClient(): Resend | undefined {
  if (!env.RESEND_API_KEY) {
    return undefined;
  }

  resendClient ??= new Resend(env.RESEND_API_KEY);

  return resendClient;
}

const FROM_ADDRESS = env.EMAIL_FROM ?? "Ronin <onboarding@resend.dev>";

function emailShell(bodyHtml: string, origin: string): string {
  return `
    <div style="background-color:#0a0a0a;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background-color:#171717;border:1px solid #262626;border-radius:12px;padding:32px;">
        <img src="${origin}/ronin_logo.jpg" width="64" height="64" alt="Ronin" style="display:block;margin:0 auto 12px;border-radius:9999px;" />
        <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fafafa;letter-spacing:-0.02em;text-align:center;">Ronin</p>
        ${bodyHtml}
      </div>
    </div>
  `;
}

async function dispatchOrLog(params: {
  to: string;
  subject: string;
  html: string;
  logLabel: string;
  logDetail: string;
}): Promise<void> {
  const client = getResendClient();

  if (!client) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not configured; cannot send email in production.",
      );
    }

    // Dev/test fallback: log the email contents so the flow is testable
    // without a real Resend account.
    console.log(
      `[email:dev] ${params.logLabel} -> ${params.to}\n${params.logDetail}`,
    );
    return;
  }

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  origin: string,
): Promise<void> {
  const html = emailShell(
    `
    <p style="margin:0 0 16px;font-size:16px;color:#e5e5e5;">Reset your password</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
      We received a request to reset your Ronin password. Click the button below to choose a new one.
      This link expires in <strong style="color:#e5e5e5;">1 hour</strong>.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#fafafa;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">
        Reset password
      </a>
    </p>
    <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#737373;word-break:break-all;">
      Or copy this link into your browser:<br />
      <a href="${resetUrl}" style="color:#a3a3a3;">${resetUrl}</a>
    </p>
    <p style="margin:0;font-size:12px;color:#737373;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `,
    origin,
  );

  await dispatchOrLog({
    to,
    subject: "Reset your Ronin password",
    html,
    logLabel: "Password reset email",
    logDetail: `Reset URL: ${resetUrl}`,
  });
}

export async function sendLoginCodeEmail(
  to: string,
  code: string,
  origin: string,
): Promise<void> {
  const html = emailShell(
    `
    <p style="margin:0 0 16px;font-size:16px;color:#e5e5e5;">Your sign-in code</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
      Use this code to sign in to Ronin. It expires in <strong style="color:#e5e5e5;">10 minutes</strong>.
    </p>
    <p style="margin:0 0 24px;font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.1em;color:#fafafa;text-align:center;background-color:#0a0a0a;border:1px solid #262626;border-radius:8px;padding:16px;">
      ${code}
    </p>
    <p style="margin:0;font-size:12px;color:#737373;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `,
    origin,
  );

  await dispatchOrLog({
    to,
    subject: `${code} is your Ronin sign-in code`,
    html,
    logLabel: "Login code email",
    logDetail: `Code: ${code}`,
  });
}
