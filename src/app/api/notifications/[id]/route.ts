import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { markNotificationRead } from "@/lib/api-services/notifications";

// PATCH /api/notifications/[id] — marks a single notification read. Scoped
// to the current user's own notifications (404 for anyone else's).
export const PATCH = withUser({
  PATCH: withUserErrorHandling(
    async (
      _req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const notification = await prisma.$transaction((tx) =>
        markNotificationRead(tx, user.id, id!),
      );
      return NextResponse.json(notification, { status: 200 });
    },
  ),
});
