"use client";

import { Check, X, Sparkles, AlertTriangle } from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";
import Button from "@/components/Button";
import PricingToggle from "@/components/billing/PricingToggle";
import { BILLING_PRICING, PREMIUM_BENEFITS } from "@/lib/constants/billing";
import { FREE_LIMITS } from "@/lib/utils/entitlements";
import type {
  BillingInterval,
  BillingStatusResponse,
} from "@/lib/data-hooks/services/billing";

interface PlanComparisonProps {
  billingStatus: BillingStatusResponse;
  isAdmin: boolean;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  onUpgrade: () => void;
  upgrading: boolean;
  onManage: () => void;
  managing: boolean;
}

/** Free-tier feature rows, mirroring the limits enforced server-side. The
 * `included` flag drives the check vs. muted-x icon so the two plans read as a
 * side-by-side comparison. */
const FREE_FEATURES = [
  { label: `${FREE_LIMITS.maxActiveBudgets} active budget`, included: true },
  { label: `${FREE_LIMITS.maxMembers} household member`, included: true },
  {
    label: `Up to ${FREE_LIMITS.maxPockets} savings pockets`,
    included: true,
  },
  { label: "AI receipt scanning", included: false },
];

/** A single feature row shared by both cards. */
function FeatureRow({
  label,
  included = true,
}: {
  label: string;
  included?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2.5 text-sm ${
        included ? "text-gray-700" : "text-gray-400"
      }`}
    >
      {included ? (
        <Check className="h-4 w-4 shrink-0 text-secondary-600" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-gray-300" />
      )}
      <span className={included ? "" : "line-through"}>{label}</span>
    </li>
  );
}

/** Small pill shown at the top-right of a plan card. */
function PlanBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "current" | "recommended" | "neutral";
}) {
  const tones = {
    current: "bg-green-50 text-green-700",
    recommended: "bg-secondary text-primary-950",
    neutral: "bg-surface-muted text-gray-600",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Two side-by-side plan cards (Free + Premium) for the settings Billing tab.
 * The Premium card is visually featured and adapts its CTA to the account's
 * current state (free / premium / complimentary) and the viewer's role.
 */
export default function PlanComparison({
  billingStatus,
  isAdmin,
  interval,
  onIntervalChange,
  onUpgrade,
  upgrading,
  onManage,
  managing,
}: PlanComparisonProps) {
  const { isPremium, complimentaryAccess } = billingStatus;
  const plan = BILLING_PRICING[interval];

  const renewalDate = billingStatus.currentPeriodEnd
    ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Free plan */}
      <div className="card-surface flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Free
          </h3>
          {!isPremium && <PlanBadge tone="current">Current plan</PlanBadge>}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">
            $0
          </span>
          <span className="text-sm text-gray-500">/mo</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Everything you need to start budgeting.
        </p>

        <ul className="mt-5 space-y-2.5">
          {FREE_FEATURES.map((feature) => (
            <FeatureRow
              key={feature.label}
              label={feature.label}
              included={feature.included}
            />
          ))}
        </ul>

        <div className="mt-6 flex-1" />

        {!isPremium ? (
          <Button variant="outline" className="w-full" disabled>
            Your current plan
          </Button>
        ) : (
          <p className="text-center text-xs text-gray-400">
            Available if you cancel Premium.
          </p>
        )}
      </div>

      {/* Premium plan — featured */}
      <div className="card-surface relative flex h-full flex-col border-2 border-secondary p-5 shadow-lifted sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              Premium
            </h3>
          </div>
          {complimentaryAccess ? (
            <PlanBadge tone="current">Complimentary</PlanBadge>
          ) : isPremium ? (
            <PlanBadge tone="current">Current plan</PlanBadge>
          ) : (
            <PlanBadge tone="recommended">Recommended</PlanBadge>
          )}
        </div>

        {/* Price / status block */}
        {complimentaryAccess ? (
          <p className="mt-4 text-sm text-gray-600">
            Your account has complimentary Premium access — every feature is
            unlocked and no billing is required.
          </p>
        ) : isPremium ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              {billingStatus.subscriptionStatus === SubscriptionStatus.CANCELED
                ? "Your subscription is cancelled. Premium access continues until "
                : "Your subscription renews "}
              {renewalDate && (
                <strong className="font-semibold text-gray-900">
                  {renewalDate}
                </strong>
              )}
              .
            </p>
            {billingStatus.subscriptionStatus ===
              SubscriptionStatus.PAST_DUE && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  We couldn&apos;t process your last payment. Update your
                  payment method to keep Premium features.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">
                {plan.amount}
              </span>
              <span className="text-sm text-gray-500">{plan.cadence}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{plan.billedAs}</p>
          </>
        )}

        <ul className="mt-5 space-y-2.5">
          {PREMIUM_BENEFITS.map((benefit) => (
            <FeatureRow key={benefit} label={benefit} />
          ))}
        </ul>

        <div className="mt-6 flex-1" />

        {/* Interval selector — only when choosing to upgrade. */}
        {!isPremium && isAdmin && (
          <PricingToggle
            interval={interval}
            onChange={onIntervalChange}
            className="mb-4"
          />
        )}

        {/* CTA */}
        {complimentaryAccess ? (
          <p className="text-center text-xs text-gray-400">
            Included with your account.
          </p>
        ) : isPremium ? (
          isAdmin ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={onManage}
              isLoading={managing}
            >
              Manage subscription
            </Button>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Ask your account admin to manage billing.
            </p>
          )
        ) : isAdmin ? (
          <Button className="w-full" onClick={onUpgrade} isLoading={upgrading}>
            {upgrading ? "Redirecting…" : "Upgrade to Premium"}
          </Button>
        ) : (
          <p className="text-center text-sm text-gray-500">
            Ask your account admin to upgrade to Premium.
          </p>
        )}
      </div>
    </div>
  );
}
