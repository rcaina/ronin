import { HttpError } from '@/lib/errors'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User } from '@prisma/client'

type HandlerWithUser = (
  req: NextRequest,
  context: { params: Record<string, string> },
  user: User,
) => Promise<Response>

export function withUserErrorHandling(handler: HandlerWithUser): HandlerWithUser {
  return async (req: NextRequest, context: { params: Record<string, string> }, user: User) => {
    try {
      return await handler(req, context, user)
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          {
            error: error.message,
            ...(error.details && { details: error.details }),
          },
          { status: error.statusCode },
        )
      }
      console.error('Unhandled API error', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      )
    }
  }
} 