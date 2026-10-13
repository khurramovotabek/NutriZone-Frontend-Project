import { NextRequest, NextResponse } from "next/server";
import { inboxFetch } from "@/lib/notifications-api";
import { getAccessToken } from "@/lib/session";

const NO_SESSION = { success: false, error: { code: "NO_SESSION", message: "Please log in." } };

/** GET /api/notifications?lang=uz&filter=all|unread&page=1 -> the signed-in customer's inbox page. */
export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json(NO_SESSION, { status: 401 });
  const q = request.nextUrl.searchParams;
  const params = new URLSearchParams({ lang: q.get("lang") ?? "uz", filter: q.get("filter") ?? "all", page: q.get("page") ?? "1", page_size: q.get("page_size") ?? "20" });
  try {
    const res = await inboxFetch(`inbox?${params}`, accessToken);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) return NextResponse.json(body ?? { success: false }, { status: res.status || 500 });
    return NextResponse.json({ success: true, data: body.data });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your notifications." } }, { status: 502 });
  }
}
