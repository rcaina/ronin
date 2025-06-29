import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '@/env';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: env.AUTH_SECRET,
    });

    return NextResponse.json({
      success: true,
      env: {
        NODE_ENV: env.NODE_ENV,
        hasAuthSecret: !!env.AUTH_SECRET,
        authSecretLength: env.AUTH_SECRET?.length ?? 0,
      },
      auth: {
        hasToken: !!token,
        tokenId: token?.id,
        tokenEmail: token?.email,
        hasBudget: token?.hasBudget,
        accountId: token?.accountId,
      },
      headers: {
        cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        NODE_ENV: env.NODE_ENV,
        hasAuthSecret: !!env.AUTH_SECRET,
      }
    }, { status: 500 });
  }
} 