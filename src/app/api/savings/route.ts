import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { createSavingsSchema } from "@/lib/api-schemas/savings";
import {
  createSavings,
  getSavings,
  getPocketLockedIds,
} from "@/lib/api-services/savings";
import {
  toSavingsSummary,
  toSavingsSummaryList,
} from "@/lib/transformers/savings";
import type { SavingsWithRelationsLite } from "@/lib/transformers/savings";
import { getAccountEntitlements } from "@/lib/api-services/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { savings, account } = await prisma.$transaction(async (tx) => {
        const savings = await getSavings(tx, user.accountId);
        const account = await getAccountEntitlements(tx, user.accountId);
        return { savings, account };
      });

      const savingsList = savings as unknown as SavingsWithRelationsLite[];
      const allPockets = savingsList.flatMap((s) => s.pockets);
      const lockedIds = getPocketLockedIds(account, allPockets);
      return NextResponse.json(toSavingsSummaryList(savingsList, lockedIds), {
        status: 200,
      });
    },
  ),
});

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const parsed = createSavingsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const savings = await prisma.$transaction((tx) =>
        createSavings(tx, parsed.data, user),
      );
      return NextResponse.json(
        toSavingsSummary(savings as unknown as SavingsWithRelationsLite),
        { status: 201 },
      );
    },
  ),
});
