import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/identity/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not load profile." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data });
}

export async function PATCH(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  // Only forward real, confirmed-existing UpdateProfileSerializer fields --
  // never pass through arbitrary client-supplied fields.
  const allowedFields = ["full_name", "email", "username", "bio", "birthday", "height_cm", "weight_kg", "goal", "language"] as const;
  const forwardBody: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in rawBody) forwardBody[field] = rawBody[field];
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/identity/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(forwardBody),
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not update profile." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data });
}
