import { Plan, SubscriptionStatus, type User } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { HttpError } from "../errors";
import { getStripe, getStripePriceId, type BillingInterval } from "../stripe";
import { isPremium } from "../utils/entitlements";

type AccountPrisma = Pick<PrismaClient, "account">;

/**
 * Creates (or reuses) the Stripe customer for an account and starts a
 * Checkout Session for a new Premium subscription. Only meaningful for
 * ADMIN users — the route enforces that gate before calling this.
 */
export const createCheckoutSession = async (
  prisma: AccountPrisma,
  user: User & { accountId: string },
  interval: BillingInterval,
  origin: string,
): Promise<string> => {
  const account = await prisma.account.findUnique({
    where: { id: user.accountId },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  if (
    account.stripeSubscriptionId &&
    account.subscriptionStatus === SubscriptionStatus.ACTIVE
  ) {
    throw new HttpError("Already subscribed — manage your plan instead", 400);
  }

  const stripe = getStripe();

  let customerId = account.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: account.name,
      metadata: { accountId: account.id },
    });
    customerId = customer.id;
    await prisma.account.update({
      where: { id: account.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: account.id,
    metadata: { accountId: account.id },
    subscription_data: { metadata: { accountId: account.id } },
    line_items: [{ price: getStripePriceId(interval), quantity: 1 }],
    success_url: `${origin}/settings?tab=billing&checkout=success`,
    cancel_url: `${origin}/settings?tab=billing&checkout=cancelled`,
  });

  if (!session.url) {
    throw new HttpError("Failed to create checkout session", 502);
  }

  return session.url;
};

/**
 * Creates a Stripe Customer Portal session so an ADMIN can manage an
 * existing subscription (update payment method, cancel, view invoices).
 */
export const createPortalSession = async (
  prisma: AccountPrisma,
  user: User & { accountId: string },
  origin: string,
): Promise<string> => {
  const account = await prisma.account.findUnique({
    where: { id: user.accountId },
  });

  if (!account?.stripeCustomerId) {
    throw new HttpError("No billing account yet", 400);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${origin}/settings?tab=billing`,
  });

  return session.url;
};

/** Billing status shape returned by `GET /api/billing/status`. */
export type BillingStatus = {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  complimentaryAccess: boolean;
  isPremium: boolean;
};

/** Loads the account's plan/subscription state for the billing settings UI. */
export const getBillingStatus = async (
  prisma: AccountPrisma,
  accountId: string,
): Promise<BillingStatus> => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  return {
    plan: account.plan,
    subscriptionStatus: account.subscriptionStatus,
    currentPeriodEnd: account.currentPeriodEnd,
    complimentaryAccess: account.complimentaryAccess,
    isPremium: isPremium(account),
  };
};

/**
 * Maps a Stripe subscription status to our simplified `SubscriptionStatus`
 * enum. Returns `null` for statuses that don't correspond to a stored state
 * (e.g. `incomplete` while awaiting the first payment) — callers should
 * leave the account untouched in that case.
 */
export const mapStripeSubscriptionStatus = (
  status: Stripe.Subscription.Status,
): SubscriptionStatus | null => {
  switch (status) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    default:
      return null;
  }
};

/**
 * Reads the current billing period end off a Stripe subscription.
 *
 * Stripe's 2025+ "Basil" API versions removed `current_period_end` from the
 * top-level Subscription object — it now lives on each subscription item
 * (`subscription.items.data[0].current_period_end`). We only ever sell a
 * single-price subscription, so the first item is authoritative.
 */
export const getSubscriptionPeriodEnd = (
  subscription: Stripe.Subscription,
): Date | null => {
  const item = subscription.items.data[0];
  if (!item) return null;
  return new Date(item.current_period_end * 1000);
};

/**
 * Handles `checkout.session.completed`: links the Stripe customer and
 * subscription to the account and flips it to Premium/Active. The account
 * is known directly from `client_reference_id`/metadata set at Checkout
 * Session creation, so this updates by account id rather than by
 * subscription id.
 */
export const syncAccountFromCheckoutSession = async (
  prisma: AccountPrisma,
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const accountId = session.client_reference_id ?? session.metadata?.accountId;
  if (!accountId) {
    console.error("checkout.session.completed: missing accountId", session.id);
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!subscriptionId || !customerId) {
    console.error(
      "checkout.session.completed: missing subscription or customer",
      session.id,
    );
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: Plan.PREMIUM,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    },
  });
};

/**
 * Handles `customer.subscription.updated`: syncs status and period end.
 * Covers renewals, past-due dunning, and cancel-at-period-end (the
 * subscription stays `active` — and therefore maps to `ACTIVE` — until the
 * period actually ends, so access correctly runs through to
 * `currentPeriodEnd`). If the mapped status is `CANCELED`, also downgrades
 * `plan` to `FREE`.
 *
 * Updates are keyed on `stripeSubscriptionId` for idempotency; if no
 * account matches yet (e.g. webhook races the checkout flow), falls back to
 * the account id stashed in the subscription's metadata.
 */
export const syncAccountFromSubscriptionUpdated = async (
  prisma: AccountPrisma,
  subscription: Stripe.Subscription,
): Promise<void> => {
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);
  if (!mappedStatus) {
    console.log(
      "customer.subscription.updated: unhandled status",
      subscription.status,
    );
    return;
  }

  const data = {
    subscriptionStatus: mappedStatus,
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    ...(mappedStatus === SubscriptionStatus.CANCELED && { plan: Plan.FREE }),
  };

  const { count } = await prisma.account.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data,
  });

  if (count === 0) {
    const accountId = subscription.metadata?.accountId;
    if (!accountId) {
      console.error(
        "customer.subscription.updated: no account matched and no metadata fallback",
        subscription.id,
      );
      return;
    }
    await prisma.account.updateMany({
      where: { id: accountId },
      data: { ...data, stripeSubscriptionId: subscription.id },
    });
  }
};

/**
 * Handles `customer.subscription.deleted`: downgrades the account to Free.
 * Keyed on `stripeSubscriptionId`, with a metadata fallback like the
 * `updated` handler above.
 */
export const syncAccountFromSubscriptionDeleted = async (
  prisma: AccountPrisma,
  subscription: Stripe.Subscription,
): Promise<void> => {
  const data = {
    plan: Plan.FREE,
    subscriptionStatus: SubscriptionStatus.CANCELED,
  };

  const { count } = await prisma.account.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data,
  });

  if (count === 0) {
    const accountId = subscription.metadata?.accountId;
    if (!accountId) {
      console.error(
        "customer.subscription.deleted: no account matched and no metadata fallback",
        subscription.id,
      );
      return;
    }
    await prisma.account.updateMany({
      where: { id: accountId },
      data: { ...data, stripeSubscriptionId: subscription.id },
    });
  }
};

/**
 * Handles `invoice.payment_failed`: marks the account past-due. The
 * subscription is referenced via `invoice.parent.subscription_details` in
 * Stripe's current API shape (there is no top-level `invoice.subscription`
 * field anymore).
 */
export const syncAccountFromInvoicePaymentFailed = async (
  prisma: AccountPrisma,
  invoice: Stripe.Invoice,
): Promise<void> => {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;

  if (!subscriptionId) {
    console.error(
      "invoice.payment_failed: invoice has no associated subscription",
      invoice.id,
    );
    return;
  }

  const { count } = await prisma.account.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { subscriptionStatus: SubscriptionStatus.PAST_DUE },
  });

  if (count === 0) {
    console.error(
      "invoice.payment_failed: no account matched subscription",
      subscriptionId,
    );
  }
};
