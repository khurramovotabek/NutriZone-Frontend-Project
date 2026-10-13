import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET /api/chat/unread-count -> {total, conversations}: unread chat messages for the menu badges (0 for visitors). */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: true, data: { total: 0, conversations: 0 } });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/unread-count`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    return NextResponse.json({ success: true, data: body?.data ?? { total: 0, conversations: 0 } });
  } catch {
    return NextResponse.json({ success: true, data: { total: 0, conversations: 0 } });
  }
}
