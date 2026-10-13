import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api";
import { LOCALE_COOKIE } from "@/i18n/config";
import { getAccessToken } from "@/lib/session";

/**
 * Thin authenticated proxy for the store POS terminal:
 * /api/my-store/pos/<path> -> {API}/api/v1/my-store/pos/<path>.
 * Only whitelisted path shapes pass through; the backend owns every rule
 * (store ownership, prices, stock, payment).
 */
const ALLOWED = /^(config|catalog|customers|stock|analytics|top|cashier|sessions|session|session\/(open|close)|sales|sales\/current|sales\/parked|sales\/[0-9a-f-]{36}(\/(items(\/[0-9a-f-]{36})?|customer|complete|void|refund|park|resume))?)$/;

async function forward(req: NextRequest, path: string[], method: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const joined = path.join("/");
  if (!ALLOWED.test(joined)) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown POS endpoint." } }, { status: 404 });
  }
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value ?? "uz";
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "X-Locale": locale };
  // the cashier the terminal was handed over to (signed by the backend, checked there on every call)
  const handover = req.headers.get("x-pos-cashier");
  if (handover && handover.length < 512) headers["X-Pos-Cashier"] = handover;
  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(await req.json().catch(() => ({})));
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/my-store/pos/${joined}${req.nextUrl.search}`, { method, headers, body, cache: "no-store" });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { success: false, error: { code: "UNKNOWN", message: "Unexpected response." } }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "NETWORK", message: "The POS service is unreachable." } }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "GET");
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "POST");
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "PATCH");
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "DELETE");
}
