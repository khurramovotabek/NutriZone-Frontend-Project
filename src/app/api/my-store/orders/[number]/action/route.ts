import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const ACTIONS = ["confirm", "start_processing", "ship", "deliver", "hand_back"] as const;

/** POST /api/my-store/orders/<number>/action {action, reason} → one step on a branch order. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  if (!(ACTIONS as readonly string[]).includes(raw?.action) || !/^[A-Z0-9-]{4,30}$/.test(number)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Unknown step." } }, { status: 422 });
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/my-store/orders/${number}/action`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: raw.action, reason: typeof raw.reason === "string" ? raw.reason.slice(0, 300) : "" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not update the order." } }, { status: res.status });
  return NextResponse.json({ success: true, data: body.data });
}
