import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { listNotificationsForUser } from "@/lib/api-services/notifications";

// GET /api/notifications — the current user's recent in-app notifications
// (never gated by entitlements; in-app is free for everyone) plus their
// unread count, for the bell icon + dropdown list in the app chrome.
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { notifications, unreadCount } = await listNotificationsForUser(
        prisma,
        user.id,
      );
      return NextResponse.json({ notifications, unreadCount }, { status: 200 });
    },
  ),
});
