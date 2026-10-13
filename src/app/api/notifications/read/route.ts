import { NextRequest, NextResponse } from "next/server";
import { inboxFetch } from "@/lib/notifications-api";
import { getAccessToken } from "@/lib/session";

/** POST /api/notifications/read  {ids: string[]} | {all: true} */
export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const body = payload?.all ? { all: true } : { ids: Array.isArray(payload?.ids) ? payload.ids.slice(0, 200) : [] };
  try {
    const res = await inboxFetch("inbox/read", accessToken, { method: "POST", body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { success: false }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not update notifications." } }, { status: 502 });
  }
}
