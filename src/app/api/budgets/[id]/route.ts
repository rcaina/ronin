import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        
        const budget = await prisma.budget.findFirst({
            where: {
                id,
                accountId: user.accountId,
                deleted: null,
            },
            include: {
                categories: {
                    where: {
                        deleted: null,
                    },
                    include: {
                        category: {
                            include: {
                                transactions: {
                                    where: {
                                        budgetId: id,
                                        deleted: null,
                                    },
                                    orderBy: {
                                        createdAt: 'desc',
                                    },
                                },
                            },
                        },
                    },
                },
                incomes: {
                    where: {
                        deleted: null,
                    },
                },
            },
        });

        if (!budget) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }

        // Transform the data to match the expected structure
        const transformedBudget = {
            ...budget,
            categories: budget.categories.map(budgetCategory => ({
                id: budgetCategory.category.id,
                name: budgetCategory.category.name,
                spendingLimit: budgetCategory.allocatedAmount,
                group: budgetCategory.category.group,
                transactions: budgetCategory.category.transactions,
            })),
        };

        return NextResponse.json(transformedBudget, { status: 200 });
    }),
}) 