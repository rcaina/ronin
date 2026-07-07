import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  type BillingInterval,
} from "../services/billing";

export const billingStatusKey = ["billing-status"] as const;

/** Account plan/subscription state — readable by any account member. */
export const useBillingStatus = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: billingStatusKey,
    queryFn: getBillingStatus,
    enabled: !!session,
    staleTime: 60 * 1000,
  });
};

/** Starts a Stripe Checkout session; caller redirects via the returned URL. */
export const useCheckout = () => {
  return useMutation({
    mutationFn: (interval: BillingInterval) => createCheckoutSession(interval),
  });
};

/** Opens the Stripe Customer Portal; caller redirects via the returned URL. */
export const useBillingPortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: () => {
      // The portal lets the admin cancel/change payment method; refresh
      // billing status whenever they come back to this tab.
      void queryClient.invalidateQueries({ queryKey: billingStatusKey });
    },
  });
};
