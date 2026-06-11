import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

type CatchAllContext = { params: Promise<{ catchAll?: string[] }> };

// Fallback for unmatched /api/* paths: respond with JSON instead of the
// default HTML 404 page, and with a 401 when the caller isn't signed in.
async function handleCatchAll(request: NextRequest, context: CatchAllContext) {
  const { catchAll = [] } = await context.params;
  const fullPath = `/api/${catchAll.join("/")}`;

  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to access this resource." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      error: "API endpoint not found",
      path: fullPath,
      method: request.method,
    },
    { status: 404 }
  );
}

export {
  handleCatchAll as GET,
  handleCatchAll as POST,
  handleCatchAll as PUT,
  handleCatchAll as DELETE,
  handleCatchAll as PATCH,
};
