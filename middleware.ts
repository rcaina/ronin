import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/env'

export async function middleware(request: NextRequest) {
  // Debug logging for production issues
  console.log('Middleware Request Debug:', {
    url: request.url,
    pathname: request.nextUrl.pathname,
    host: request.nextUrl.host,
    protocol: request.nextUrl.protocol,
    hasCookie: !!request.headers.get('cookie'),
    cookieLength: request.headers.get('cookie')?.length ?? 0,
    userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...',
  });

  const token = await getToken({ 
    req: request,
    secret: env.AUTH_SECRET,
  })
  
  // Debug logging for production issues
  console.log('Middleware Debug:', {
    pathname: request.nextUrl.pathname,
    hasToken: !!token,
    tokenId: token?.id,
    tokenEmail: token?.email,
    hasBudget: token?.hasBudget,
    accountId: token?.accountId,
    env: {
      NODE_ENV: env.NODE_ENV,
      hasAuthSecret: !!env.AUTH_SECRET,
    }
  });
  
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/sign-in') || 
                    pathname.startsWith('/sign-up');
  const isSetupPage = pathname.startsWith('/setup') || pathname.startsWith('/welcome');

  console.log('Middleware Path Analysis:', {
    pathname,
    isAuthPage,
    isSetupPage,
    hasBudget: token?.hasBudget,
  });

  if (isAuthPage) {
    if (token) {
      console.log('Redirecting authenticated user from auth page to home');
      return NextResponse.redirect(new URL('/', request.url))
    }
    console.log('Allowing unauthenticated user to access auth page');
    return NextResponse.next()
  }

  if (!token) {
    console.log('No token found, redirecting to sign-in');
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // If user is authenticated and on setup/welcome pages, allow access
  if (isSetupPage) {
    console.log('Allowing authenticated user to access setup page');
    return NextResponse.next()
  }

  // If authenticated and not on setup/welcome/auth pages, check if user has budget
  if (!token.hasBudget) {
    console.log('User has no budget, redirecting to welcome page');
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  console.log('Middleware allowing request to proceed');
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 