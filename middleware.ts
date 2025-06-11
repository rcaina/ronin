import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/env'

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: env.AUTH_SECRET,
  })
  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-in') || 
                    request.nextUrl.pathname.startsWith('/sign-up')

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