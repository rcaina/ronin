import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '@/env';
import type { NextRequest } from 'next/server';
import { db } from '@/server/db';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: env.AUTH_SECRET,
    });

    if (!token?.accountId) {
      return NextResponse.json({
        success: false,
        error: 'No account ID found in token'
      }, { status: 401 });
    }

    // Check budgets directly from database
    const budgetCount = await db.budget.count({
      where: {
        accountId: token.accountId,
        deleted: null,
      },
    });

    const budgets = await db.budget.findMany({
      where: {
        accountId: token.accountId,
        deleted: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        deleted: true,
      }
    });

    return NextResponse.json({
      success: true,
      token: {
        accountId: token.accountId,
        hasBudget: token.hasBudget,
      },
      database: {
        budgetCount,
        budgets,
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 