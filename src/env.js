import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    // Canonical public origin used to build links in transactional emails, so
    // reset links can't be poisoned via the Host header.
    APP_URL:
      process.env.NODE_ENV === "production"
        ? z.string().url()
        : z.string().url().optional(),
    AUTH_ALLOWED_EMAILS: z.string().optional(),
    DATABASE_URL: z.string().url(),
    // Receipt scanning is provider-agnostic. AI_PROVIDER picks the backend;
    // when unset it auto-detects from whichever API key is present (Gemini
    // first, since it has a free tier).
    AI_PROVIDER: z.enum(["gemini", "anthropic"]).optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().optional(),
    // Stripe billing. Optional so the app still boots for devs without Stripe
    // configured; billing routes guard at runtime and return a clear error
    // instead of crashing app startup.
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_MONTHLY_ID: z.string().optional(),
    STRIPE_PRICE_ANNUAL_ID: z.string().optional(),
    // Transactional email (password reset / login codes). Optional — see
    // src/server/email.ts for dev-mode fallback behavior when unset.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
    AUTH_ALLOWED_EMAILS: process.env.AUTH_ALLOWED_EMAILS,
    DATABASE_URL: process.env.DATABASE_URL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_MONTHLY_ID: process.env.STRIPE_PRICE_MONTHLY_ID,
    STRIPE_PRICE_ANNUAL_ID: process.env.STRIPE_PRICE_ANNUAL_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
