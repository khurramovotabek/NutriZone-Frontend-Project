import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface BackendErrorBody {
  error?: { code?: string; message?: string; details?: { fields?: { code?: string }[] } };
}

/** GET -- the current customer's own rating for this store (`rating: null` if they haven't rated it yet). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/stores/${encodeURIComponent(slug)}/rating`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not load your rating." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data });
}

/** POST -- submit or update the current customer's own rating (1-5, upsert). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const rating = Number(rawBody?.rating);
  // optional private review -- only sent when the customer wrote/changed it
  const payload: { rating: number; comment?: string } = { rating };
  if (typeof rawBody?.comment === "string") payload.comment = rawBody.comment.slice(0, 1000);

  const response = await fetch(`${API_BASE_URL}/api/v1/stores/${encodeURIComponent(slug)}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    const code = errBody.error?.details?.fields?.[0]?.code ?? errBody.error?.code ?? "UNKNOWN";
    return NextResponse.json({ success: false, error: { code, message: errBody.error?.message ?? "Could not save your rating." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data });
}
