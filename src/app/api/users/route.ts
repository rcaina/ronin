import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createUser, getAccountUsers } from "@/lib/api-services/users";
import { createUserSchema } from "@/lib/api-schemas/users";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canInviteMember } from "@/lib/utils/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      return await prisma.$transaction(async (tx) => {
        const users = await getAccountUsers(tx, user.accountId);

        return NextResponse.json(users, { status: 200 });
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

      const validationResult = createUserSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      const currentMemberCount = await prisma.accountUser.count({
        where: { accountId: user.accountId },
      });
      const entitlementCheck = canInviteMember(account, currentMemberCount);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      return await prisma.$transaction(async (tx) => {
        const newUser = await createUser(tx, validationResult.data, user);

        return NextResponse.json(newUser, { status: 201 });
      });
    },
  ),
});
