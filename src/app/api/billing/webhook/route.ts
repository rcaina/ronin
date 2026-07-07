import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import {
  notifyTrialWillEnd,
  syncAccountFromCheckoutSession,
  syncAccountFromInvoicePaymentFailed,
  syncAccountFromSubscriptionDeleted,
  syncAccountFromSubscriptionUpdated,
} from "@/lib/api-services/billing";

// POST /api/billing/webhook — Stripe webhook endpoint. Deliberately NOT
// wrapped in `withUser`: Stripe calls this unauthenticated and identifies
// itself via the `stripe-signature` header instead, verified below against
// the raw request body. Must stay reachable from middleware.ts (which
// excludes /api entirely) and the [[...catchAll]] route (which only 401s
// *unmatched* /api paths).
export async function POST(req: Request): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is unset");
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await syncAccountFromCheckoutSession(prisma, event.data.object);
        break;
      case "customer.subscription.updated":
        await syncAccountFromSubscriptionUpdated(prisma, event.data.object);
        break;
      case "customer.subscription.deleted":
        await syncAccountFromSubscriptionDeleted(prisma, event.data.object);
        break;
      case "customer.subscription.trial_will_end":
        notifyTrialWillEnd(event.data.object);
        break;
      case "invoice.payment_failed":
        await syncAccountFromInvoicePaymentFailed(prisma, event.data.object);
        break;
      default:
        console.log("Unhandled Stripe webhook event type", event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    // Return 500 so Stripe retries — the event may have been a transient
    // DB/network failure rather than a permanent one.
    console.error("Stripe webhook handler error", event.type, err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
