import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api";
import { LOCALE_COOKIE } from "@/i18n/config";
import { getAccessToken } from "@/lib/session";

/**
 * Thin authenticated proxy for the branch's "Mahsulot qabul qilish" page:
 * /api/my-store/transfers[/<path>] -> {API}/api/v1/my-store/transfers[/<path>].
 * Only the known shapes pass (list, lookup, one transfer, its receive action, its .xlsx waybill);
 * the backend decides everything else (which branch, which transfer, every stock rule).
 */
const ALLOWED = /^(|lookup|[0-9a-f-]{36}(\/(receive|document\.xlsx))?)$/;

async function forward(req: NextRequest, path: string[] | undefined, method: "GET" | "POST") {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const joined = (path ?? []).join("/");
  if (!ALLOWED.test(joined)) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown endpoint." } }, { status: 404 });
  }
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value ?? "uz";
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "X-Locale": locale };
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(await req.json().catch(() => ({})));
  }
  const url = `${API_BASE_URL}/api/v1/my-store/transfers${joined ? `/${joined}` : ""}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, { method, headers, body, cache: "no-store" });
    if (joined.endsWith("document.xlsx") && res.ok) {
      // the waybill: stream the file through with its name
      return new NextResponse(res.body, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": res.headers.get("content-disposition") ?? "attachment",
          "Cache-Control": "no-store",
        },
      });
    }
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { success: false, error: { code: "UNKNOWN", message: "Unexpected response." } }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "NETWORK", message: "The service is unreachable." } }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "GET");
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path, "POST");
}
