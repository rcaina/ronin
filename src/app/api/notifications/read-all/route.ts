import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { markAllNotificationsRead } from "@/lib/api-services/notifications";

// POST /api/notifications/read-all — marks every unread notification for the
// current user as read (the bell dropdown's "mark all as read" action).
export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      await prisma.$transaction((tx) => markAllNotificationsRead(tx, user.id));
      return NextResponse.json({ success: true }, { status: 200 });
    },
  ),
});
