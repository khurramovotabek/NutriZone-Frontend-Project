import { NextResponse } from "next/server";
import { inboxFetch } from "@/lib/notifications-api";
import { getAccessToken } from "@/lib/session";

/** GET /api/notifications/unread-count -> {unread}. A visitor without a session simply gets 0 (the bell hides). */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: true, data: { unread: 0, anonymous: true } });
  try {
    const res = await inboxFetch("inbox/unread-count", accessToken);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) return NextResponse.json({ success: true, data: { unread: 0, anonymous: res.status === 401 } });
    return NextResponse.json({ success: true, data: body.data });
  } catch {
    return NextResponse.json({ success: true, data: { unread: 0 } });
  }
}
