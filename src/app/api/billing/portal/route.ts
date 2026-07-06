import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/errors";
import type { User } from "@prisma/client";
import { createPortalSession } from "@/lib/api-services/billing";

// POST /api/billing/portal — ADMIN-only. Creates a Stripe Customer Portal
// session so the admin can manage payment method / cancellation. Returns
// { url } for the client to redirect to.
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

      const url = await createPortalSession(prisma, user, req.nextUrl.origin);

      return NextResponse.json({ url }, { status: 200 });
    },
  ),
});
