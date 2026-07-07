import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/errors";
import type { User } from "@prisma/client";
import { checkoutSchema } from "@/lib/api-schemas/billing";
import { createCheckoutSession } from "@/lib/api-services/billing";

// POST /api/billing/checkout — ADMIN-only. Creates (or reuses) the Stripe
// customer for the account and starts a Checkout Session for a new Premium
// subscription. Returns { url } for the client to redirect to.
export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      if (user.role !== "ADMIN") {
        throw new HttpError("Only account admins can manage billing", 403);
      }

      const body = (await req.json().catch(() => ({}))) as unknown;
      const validationResult = checkoutSchema.safeParse(body);

      if (!validationResult.success) {
        throw new HttpError(
          "Invalid request body",
          400,
          validationResult.error,
        );
      }

      const url = await createCheckoutSession(
        prisma,
        user,
        validationResult.data.interval,
        req.nextUrl.origin,
      );

      return NextResponse.json({ url }, { status: 200 });
    },
  ),
});
