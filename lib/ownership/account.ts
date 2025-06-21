import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Verifies that a user belongs to the same account as the requesting user
 * @param requestingUser - The user making the request
 * @param targetUserId - The user ID to verify ownership for
 * @returns Promise<boolean> - True if the user belongs to the same account
 */
export async function verifyAccountOwnership(
  requestingUser: User & { accountId: string },
  targetUserId: string
): Promise<boolean> {
  const accountUser = await prisma.accountUser.findFirst({
    where: {
      userId: targetUserId,
      accountId: requestingUser.accountId,
    },
  });

  return !!accountUser;
}

/**
 * Middleware function that ensures a user belongs to the same account
 * @param requestingUser - The user making the request
 * @param targetUserId - The user ID to verify ownership for
 * @returns Promise<NextResponse | null> - Returns error response if verification fails, null if successful
 */
export async function ensureAccountOwnership(
  requestingUser: User & { accountId: string },
  targetUserId: string
): Promise<NextResponse | null> {
  const hasOwnership = await verifyAccountOwnership(requestingUser, targetUserId);
  
  if (!hasOwnership) {
    return NextResponse.json(
      { message: "User not found in this account" },
      { status: 403 }
    );
  }

  return null;
} 