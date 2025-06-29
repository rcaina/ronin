import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import { NextResponse } from "next/server"

export const POST = withUser({
    POST: withUserErrorHandling(async () => {
        // This endpoint is called when a user creates their first budget
        // The session will be updated automatically on the next request
        return NextResponse.json({ 
            message: "Session will be updated on next request",
            hasBudget: true 
        }, { status: 200 })
    }),
}) 