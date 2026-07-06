import { type NextRequest, NextResponse } from "next/server";
import { Role, type User } from "@prisma/client";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/errors";
import { updateFeatureSettingsSchema } from "@/lib/api-schemas/feature-settings";
import {
  getFeatureSettings,
  updateFeatureSettings,
} from "@/lib/api-services/feature-settings";

// GET /api/account/feature-settings — any account member can read the
// account's module on/off preferences (used to filter nav/pages and to
// render the Features settings tab).
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const settings = await getFeatureSettings(prisma, user.accountId);

      return NextResponse.json(settings, { status: 200 });
    },
  ),
});

// PATCH /api/account/feature-settings — ADMIN-only. Merges the given subset
// of module preferences over the account's existing settings.
export const PATCH = withUser({
  PATCH: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      if (user.role !== Role.ADMIN) {
        throw new HttpError(
          "Only account admins can change feature settings",
          403,
        );
      }

      const body = (await req.json()) as unknown;
      const validationResult = updateFeatureSettingsSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const settings = await prisma.$transaction(async (tx) =>
        updateFeatureSettings(tx, user.accountId, validationResult.data),
      );

      return NextResponse.json(settings, { status: 200 });
    },
  ),
});
