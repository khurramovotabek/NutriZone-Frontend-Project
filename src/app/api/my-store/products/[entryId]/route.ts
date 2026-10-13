import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const response = await fetch(`${API_BASE_URL}/api/v1/my-store/products/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ quantity: rawBody.quantity }),
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not update product." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/my-store/products/${entryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status !== 204) {
    const body = await response.json().catch(() => ({}));
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not remove product." } }, { status: response.status });
  }
  return new NextResponse(null, { status: 204 });
}
