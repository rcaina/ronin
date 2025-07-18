import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  return handleCatchAll(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  return handleCatchAll(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  return handleCatchAll(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  return handleCatchAll(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  return handleCatchAll(request, params);
}

async function handleCatchAll(
  request: NextRequest,
  params: Promise<Record<string, string>>
) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams.catchAll ?? [];
  const fullPath = `/api/${Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments}`;

  // Check if user is authenticated
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to access this resource." },
      { status: 401 }
    );
  }

  // Return 404 for unmatched API routes
  return NextResponse.json(
    {
      error: "API endpoint not found",
      path: fullPath,
      method: request.method,
    },
    { status: 404 }
  );
}
