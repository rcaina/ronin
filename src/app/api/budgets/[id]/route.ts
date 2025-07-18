import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { updateBudget, deleteBudget } from "@/lib/api-services/budgets"
import { createBudgetSchema } from "@/lib/api-schemas/budgets"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        const { searchParams } = new URL(req.url);
        const excludeCardPayments = searchParams.get('excludeCardPayments') === 'true';
        
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
                        category: true,
                        transactions: {
                            where: {
                                deleted: null,
                                ...(excludeCardPayments && {
                                    transactionType: {
                                        not: 'CARD_PAYMENT'
                                    }
                                }),
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                        },
                    },
                },
                incomes: {
                    where: {
                        deleted: null,
                    },
                },
                transactions: {
                    where: {
                        deleted: null,
                        categoryId: null, // Only transactions without categories (like card payments)
                        ...(excludeCardPayments && {
                            transactionType: {
                                not: 'CARD_PAYMENT'
                            }
                        }),
                    },
                    include: {
                        card: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
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
            categories: budget.categories?.map(budgetCategory => ({
                ...budgetCategory,
                category: {
                    id: budgetCategory.category.id,
                    name: budgetCategory.category.name,
                    group: budgetCategory.category.group,
                },
                transactions: budgetCategory.transactions || [],
            })) || [],
        };

        return NextResponse.json(transformedBudget, { status: 200 });
    }),
})

export const PUT = withUser({
    PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        
        if (!id) {
            return NextResponse.json({ message: "Budget ID is required" }, { status: 400 });
        }

        const body = await req.json() as unknown;
        const updateBudgetSchema = createBudgetSchema.partial()
        const validationResult = updateBudgetSchema.safeParse(body);
        
        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Validation failed", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const budget = await prisma.$transaction(async (tx) => 
            await updateBudget(tx, id, validationResult.data, user)
        );

        return NextResponse.json(
            { message: 'Budget updated successfully', budget },
            { status: 200 }
        );
    }),
})

export const DELETE = withUser({
    DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        
        if (!id) {
            return NextResponse.json({ message: "Budget ID is required" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => 
            await deleteBudget(tx, id, user)
        );

        return NextResponse.json(
            { message: 'Budget deleted successfully' },
            { status: 200 }
        );
    }),
}) 