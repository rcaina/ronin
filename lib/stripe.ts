import Stripe from "stripe";
import { env } from "@/env";
import { HttpError } from "@/lib/errors";

let stripeClient: Stripe | null = null;

/**
 * Lazily instantiates a singleton Stripe client. Billing routes call this
 * instead of constructing `Stripe` at module scope so the app still boots
 * (and every non-billing route keeps working) when Stripe env vars are
 * unset, e.g. local dev without billing configured. Throws a 503 `HttpError`
 * at call time instead.
 */
export const getStripe = (): Stripe => {
  if (stripeClient) return stripeClient;

  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError("Billing is not configured", 503);
  }

  // Omit `apiVersion` to use the version pinned by the installed SDK.
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  return stripeClient;
};

export type BillingInterval = "month" | "year";

/**
 * Resolves the Stripe Price ID for a billing interval from env. Throws a
 * 503 `HttpError` if the corresponding price isn't configured.
 */
export const getStripePriceId = (interval: BillingInterval): string => {
  const priceId =
    interval === "month"
      ? env.STRIPE_PRICE_MONTHLY_ID
      : env.STRIPE_PRICE_ANNUAL_ID;

  if (!priceId) {
    throw new HttpError("Billing is not configured", 503);
  }

  return priceId;
};
