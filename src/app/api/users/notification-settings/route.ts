import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { updateNotificationSettingsSchema } from "@/lib/api-schemas/notification-settings";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/api-services/notification-settings";

// GET /api/users/notification-settings — the current user's own per-trigger
// notification preferences (see lib/types/notification-settings.ts).
// Distinct from the account-wide /api/account/feature-settings toggle.
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const settings = await getNotificationSettings(prisma, user.id);
      return NextResponse.json(settings, { status: 200 });
    },
  ),
});

// PATCH /api/users/notification-settings — merges a subset of trigger
// preferences over the user's existing settings. No admin check — these are
// personal preferences, unlike the account-wide feature toggles.
export const PATCH = withUser({
  PATCH: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const parsed = updateNotificationSettingsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const settings = await prisma.$transaction((tx) =>
        updateNotificationSettings(tx, user.id, parsed.data),
      );
      return NextResponse.json(settings, { status: 200 });
    },
  ),
});
