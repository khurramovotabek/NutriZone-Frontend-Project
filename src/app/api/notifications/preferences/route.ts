import { NextRequest, NextResponse } from "next/server";
import { inboxFetch } from "@/lib/notifications-api";
import { getAccessToken } from "@/lib/session";

const CHANNELS = new Set(["telegram", "in_app", "email", "sms", "push"]);
const TYPES = new Set(["transactional", "promotional", "system"]);

async function relay(res: Response) {
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, { status: res.status });
}

/** GET -- the customer's (channel, notification_type, enabled) matrix. */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  try {
    return relay(await inboxFetch("preferences", accessToken, { method: "GET" }));
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load preferences." } }, { status: 502 });
  }
}

/** POST {channel, notification_type, enabled} -- turn one combination on or off. */
export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  if (!CHANNELS.has(payload?.channel) || !TYPES.has(payload?.notification_type) || typeof payload?.enabled !== "boolean") {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid preference." } }, { status: 422 });
  }
  try {
    const path = payload.enabled ? "preferences/enable" : "preferences/disable";
    return relay(await inboxFetch(path, accessToken, { method: "POST", body: JSON.stringify({ channel: payload.channel, notification_type: payload.notification_type }) }));
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not update preferences." } }, { status: 502 });
  }
}
