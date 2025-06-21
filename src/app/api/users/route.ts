import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, _context, user: User & { accountId: string }) => {
    const accountUsers = await prisma.accountUser.findMany({
      where: {
        accountId: user.accountId,
      },
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

    const users = accountUsers.map(au => au.user);
    return NextResponse.json(users, { status: 200 });
  }),
}); 