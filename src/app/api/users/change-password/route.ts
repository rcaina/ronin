import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json().catch(() => null)) as {
        currentPassword?: unknown;
        newPassword?: unknown;
      } | null;

      const currentPassword = body?.currentPassword;
      const newPassword = body?.newPassword;

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        !currentPassword ||
        !newPassword
      ) {
        return NextResponse.json(
          { error: "Current and new password are required" },
          { status: 400 },
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password ?? "",
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json(
        { message: "Password updated" },
        { status: 200 },
      );
    },
  ),
});
