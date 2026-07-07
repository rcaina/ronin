import type { Plan, SubscriptionStatus } from "@prisma/client";
import { parseErrorResponse } from "./http";

export type BillingInterval = "month" | "year";

/** Mirrors `BillingStatus` from `lib/api-services/billing.ts`, with dates
 * serialized to ISO strings over the wire. */
export interface BillingStatusResponse {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  complimentaryAccess: boolean;
  isPremium: boolean;
}

export const getBillingStatus = async (): Promise<BillingStatusResponse> => {
  const response = await fetch("/api/billing/status");
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<BillingStatusResponse>;
};

export const createCheckoutSession = async (
  interval: BillingInterval,
): Promise<{ url: string }> => {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interval }),
  });

  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<{ url: string }>;
};

export const createPortalSession = async (): Promise<{ url: string }> => {
  const response = await fetch("/api/billing/portal", { method: "POST" });

  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<{ url: string }>;
};
