import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/env'

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: env.AUTH_SECRET,
  })
  
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/sign-in') || 
                    pathname.startsWith('/sign-up');
  const isSetupPage = pathname.startsWith('/welcome');

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!token) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // If user is authenticated and on setup/welcome pages, allow access
  if (isSetupPage) {
    return NextResponse.next()
  }

  // If authenticated and not on setup/welcome/auth pages, check if user has budget
  if (!token.hasBudget) {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

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