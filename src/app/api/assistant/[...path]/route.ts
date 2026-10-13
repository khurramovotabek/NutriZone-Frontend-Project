import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api";
import { LOCALE_COOKIE } from "@/i18n/config";
import { getAccessToken } from "@/lib/session";
import { forwardedForHeader } from "@/lib/client-ip";

/**
 * Same-origin proxy for the AI shopping assistant: /api/assistant/<path> -> {API}/api/v1/assistant/<path>.
 *
 * - The browser gets an anonymous, random, httpOnly id (cookie `nz_ai`) that owns its conversations; the backend
 *   only stores its hash. A signed-in shopper's token is forwarded too, so the conversation is linked to the account.
 * - `chat` answers with a text/event-stream that is passed through chunk by chunk (no buffering).
 */
const ALLOWED = /^(status|chat|conversations\/[0-9a-f-]{36}(\/feedback)?)$/;
const CLIENT_COOKIE = "nz_ai";
const YEAR = 60 * 60 * 24 * 365;

async function forward(req: NextRequest, path: string[], method: "GET" | "POST") {
  const joined = path.join("/");
  if (!ALLOWED.test(joined)) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown endpoint." } }, { status: 404 });
  }
  const jar = await cookies();
  let clientId = jar.get(CLIENT_COOKIE)?.value;
  const fresh = !clientId;
  if (!clientId) clientId = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
  const headers: Record<string, string> = { "X-Assistant-Client": clientId, ...(await forwardedForHeader()) };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    const payload = await req.json().catch(() => ({}));
    if (joined === "chat") payload.locale = jar.get(LOCALE_COOKIE)?.value ?? payload.locale ?? "uz";
    body = JSON.stringify(payload);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/assistant/${joined}`, { method, headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json({ success: false, error: { code: "NETWORK", message: "The assistant is unreachable." } }, { status: 502 });
  }

  let out: NextResponse;
  if (res.ok && (res.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    out = new NextResponse(res.body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
    });
  } else {
    const data = await res.json().catch(() => null);
    out = NextResponse.json(data ?? { success: false, error: { code: "UNKNOWN", message: "Unexpected response." } }, { status: res.status });
  }
  if (fresh) out.cookies.set(CLIENT_COOKIE, clientId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR });
  return out;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "GET");
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "POST");
}
