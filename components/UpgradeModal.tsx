"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { toast } from "react-hot-toast";
import { Sparkles } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import PricingToggle from "./billing/PricingToggle";
import PremiumBenefitsList from "./billing/PremiumBenefitsList";
import { useCheckout } from "@/lib/data-hooks/billing/useBilling";
import { TRIAL_PERIOD_DAYS } from "@/lib/constants/billing";
import type { BillingInterval } from "@/lib/data-hooks/services/billing";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Short explanation of why the paywall triggered, e.g. a 402 reason. */
  reason?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason,
}: UpgradeModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;
  const [interval, setInterval] = useState<BillingInterval>("year");
  const checkoutMutation = useCheckout();

  const handleUpgrade = async () => {
    try {
      const { url } = await checkoutMutation.mutateAsync(interval);
      window.location.assign(url);
    } catch (error) {
      console.error("Failed to start checkout:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again.",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade to Premium"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Unlock the full Ronin experience
            </p>
            {reason && <p className="mt-0.5 text-sm text-gray-500">{reason}</p>}
          </div>
        </div>

        <PremiumBenefitsList />

        {isAdmin ? (
          <>
            <PricingToggle interval={interval} onChange={setInterval} />

            <Button
              className="w-full"
              onClick={handleUpgrade}
              isLoading={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending
                ? "Redirecting…"
                : `Start ${TRIAL_PERIOD_DAYS}-day free trial`}
            </Button>
            <p className="text-center text-xs text-gray-500">
              No charge today. Your card will be billed after the trial. Cancel
              anytime.
            </p>
          </>
        ) : (
          <div className="rounded-xl bg-surface-muted p-3">
            <p className="text-sm text-gray-600">
              Ask your account admin to upgrade to Premium.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
