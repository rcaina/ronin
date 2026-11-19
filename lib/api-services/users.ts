import {
  Role,
  SubscriptionStatus,
  type PrismaClient,
  type User,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type {
  createUserSchema,
  updateProfileSchema,
} from "../api-schemas/users";
import { HttpError } from "../errors";

export async function createUser(
  tx: PrismaClientTx,
  data: z.infer<typeof createUserSchema>,
  user: User & { accountId: string },
) {
  if (user.role !== Role.ADMIN) {
    throw new HttpError("Only administrators can create users", 403);
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(tx, data.email);

  if (existingUser) {
    throw new HttpError("User with this email already exists", 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Create the user
  const createdUser = await tx.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: hashedPassword,
      role: data.role as Role,
    },
    omit: { password: true },
  });

  await tx.accountUser.create({
    data: {
      userId: createdUser.id,
      accountId: user.accountId,
    },
  });

  return createdUser;
}

export async function getAccountUsers(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  accountId: string,
) {
  const accountUsers = await tx.accountUser.findMany({
    where: {
      accountId,
    },
    orderBy: { user: { createdAt: "asc" } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return accountUsers.map((au) => au.user);
}

export async function findUserByEmail(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  email: string,
) {
  return await tx.user.findUnique({
    where: { email },
  });
}

/** Statuses Stripe still bills for; an account in one must not be deleted. */
export const LIVE_SUBSCRIPTION: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

export async function deleteUserAccount(
  tx: PrismaClientTx,
  user: User & { accountId: string },
  password: string,
) {
  // Serializes concurrent deletes so two last members can't both just deactivate.
  await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${user.accountId} FOR UPDATE`;

  const account = await tx.account.findUnique({
    where: { id: user.accountId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  // Verify user password
  const verifiedUser = await bcrypt.compare(password, user.password ?? "");

  if (!verifiedUser) {
    throw new HttpError("Invalid password", 400);
  }

  // Distinct by user: an account can hold duplicate account_user rows for one user.
  const otherMembers = [
    ...new Map(
      account.users
        .filter((au) => au.user.deleted === null && au.userId !== user.id)
        .map((au) => [au.userId, au.user]),
    ).values(),
  ];
  const deletesEntireAccount = otherMembers.length === 0;

  if (deletesEntireAccount) {
    if (
      account.subscriptionStatus &&
      LIVE_SUBSCRIPTION.includes(account.subscriptionStatus)
    ) {
      throw new HttpError(
        "Cancel your subscription in Settings, under Billing, before deleting your account.",
        409,
      );
    }
    await deleteAccountData(tx, user.accountId, user.id);
  } else {
    // Never leave the account without an admin: promote the longest-standing member.
    const lockedRole = account.users.find((au) => au.userId === user.id)?.user
      .role;
    if (
      lockedRole === Role.ADMIN &&
      !otherMembers.some((member) => member.role === Role.ADMIN)
    ) {
      const [successor] = otherMembers.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      await tx.user.update({
        where: { id: successor!.id },
        data: { role: Role.ADMIN },
      });
    }

    await tx.accountUser.deleteMany({
      where: {
        accountId: user.accountId,
        userId: user.id,
      },
    });

    // Deactivate the user instead of deleting them
    await tx.user.update({
      where: { id: user.id },
      data: {
        deleted: new Date(),
        email: null, // Remove email to prevent re-login
        password: null, // Remove password for security
      },
    });
  }

  return {
    message: deletesEntireAccount
      ? "Account deleted successfully"
      : "User deactivated successfully",
    deletedEntireAccount: deletesEntireAccount,
  };
}

/** Hard-deletes an account and everything in it, children before parents (most FKs are RESTRICT), then `userId`'s own rows and user. */
export async function deleteAccountData(
  tx: PrismaClientTx,
  accountId: string,
  userId: string | null,
) {
  const accountBudget = { budget: { accountId } };

  await tx.recurringTransaction.deleteMany({ where: { accountId } });
  await tx.allocation.deleteMany({
    where: { pocket: { savings: { accountId } } },
  });
  await tx.pocket.deleteMany({ where: { savings: { accountId } } });
  await tx.savings.deleteMany({ where: { accountId } });
  await tx.transaction.deleteMany({
    where: { OR: [{ accountId }, { Budget: { accountId } }] },
  });
  await tx.category.deleteMany({
    where: { OR: [accountBudget, { accountId }] },
  });
  await tx.card.deleteMany({
    where: {
      OR: [accountBudget, ...(userId ? [{ userId, budgetId: null }] : [])],
    },
  });
  await tx.budget.deleteMany({ where: { accountId } });
  await tx.accountUser.deleteMany({ where: { accountId } });
  await tx.account.delete({ where: { id: accountId } });

  if (userId) {
    await tx.notification.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  }
}

export async function updateUserProfile(
  tx: PrismaClientTx,
  data: z.infer<typeof updateProfileSchema>,
  user: User & { accountId: string },
) {
  // Check if email is being updated and if it already exists
  if (data.email && data.email !== user.email) {
    const existingUser = await findUserByEmail(tx, data.email);
    if (existingUser && existingUser.id !== user.id) {
      throw new Error("Email already exists");
    }
  }

  // Prepare update data
  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    theme?: string;
  } = {};

  if (data.name) {
    updateData.name = data.name;
  }
  if (data.email) {
    updateData.email = data.email;
  }
  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }
  if (data.theme) {
    updateData.theme = data.theme;
  }

  // Update the user profile
  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return updatedUser;
}
