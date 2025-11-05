import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { createPocketSchema } from "@/lib/api-schemas/savings";
import { createPocket, getPockets } from "@/lib/api-services/savings";
import { toPocketSummary, toPocketSummaryList } from "@/lib/transformers/savings";


export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { searchParams } = new URL(req.url);
    const savingsId = searchParams.get("savingsId");

    const pockets = await prisma.$transaction((tx) => getPockets(tx, user.accountId, savingsId ?? undefined));
    return NextResponse.json(toPocketSummaryList(pockets), { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    const parsed = createPocketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.errors },
        { status: 400 },
      );
    }

    const pocket = await prisma.$transaction((tx) => createPocket(tx, parsed.data, user));
    if (!pocket) return NextResponse.json({ message: "Savings account not found" }, { status: 404 });

    return NextResponse.json(toPocketSummary(pocket), { status: 201 });
  }),
});



