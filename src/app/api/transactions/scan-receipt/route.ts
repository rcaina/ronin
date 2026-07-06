import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/errors";
import { ensureBudgetOwnership } from "@/lib/utils/auth";
import { scanReceipt } from "@/lib/api-services/receipts";
import { scanReceiptSchema } from "@/lib/api-schemas/receipt";
import type { User } from "@prisma/client";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canScanReceipt } from "@/lib/utils/entitlements";
import { getFeatureSettings } from "@/lib/api-services/feature-settings";
import { isFeatureEnabled } from "@/lib/utils/features";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = scanReceiptSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      // Unlike the other toggles (UX-only), AI receipt scanning sends data
      // to a third party — the opt-out must be enforced server-side, not
      // just hidden client-side.
      const featureSettings = await getFeatureSettings(prisma, user.accountId);
      if (!isFeatureEnabled(featureSettings, "aiReceiptScanning")) {
        throw new HttpError(
          "AI receipt scanning is turned off for your account. An admin can turn it back on in settings.",
          403,
        );
      }

      const { budgetId, imageBase64, mediaType } = validationResult.data;
      await ensureBudgetOwnership(budgetId, user.accountId);

      const account = await getAccountEntitlements(prisma, user.accountId);
      const entitlementCheck = canScanReceipt(account);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      const result = await scanReceipt(prisma, budgetId, {
        imageBase64,
        mediaType,
      });

      return NextResponse.json(result, { status: 200 });
    },
  ),
});
