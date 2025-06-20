import { type NextRequest, NextResponse } from 'next/server'

  import { auth } from '@/server/auth'
import prisma from '../prisma'
import type { User } from '@prisma/client'

// Type helper for handlers that will receive the Request and user object
type HandlerWithUser = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: User & { accountId: string },
) => Promise<Response>

// This factory allows you to pass handlers for each HTTP method
type MethodHandlers = Partial<{
  GET: HandlerWithUser
  POST: HandlerWithUser
  PUT: HandlerWithUser
  DELETE: HandlerWithUser
  PATCH: HandlerWithUser
}>

export function withUser(handlers: MethodHandlers) {
  return async function (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) {
    const session = await auth();

    console.log({session})

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Make sure user exists in DB
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Add accountId from session to user object
    const userWithAccountId = {
      ...user,
      accountId: session.user.accountId,
    }

    const method = req.method as keyof MethodHandlers
    const handler = handlers[method]

    if (!handler) {
      return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
    }

    return handler(req, context, userWithAccountId)
  }
}
