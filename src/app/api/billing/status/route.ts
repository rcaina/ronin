import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { getBillingStatus } from "@/lib/api-services/billing";

// GET /api/billing/status — any account member can read the account's
// current plan/subscription state (used to render the billing settings UI
// and to gate premium affordances client-side).
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const status = await getBillingStatus(prisma, user.accountId);

      return NextResponse.json(status, { status: 200 });
    },
  ),
});
