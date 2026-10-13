import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** Public, read-only catalog endpoints the browser may read through this proxy (never anything per-user). */
const ALLOWED = new Set(["products/search", "products/search/popular", "products/goals", "products/recommendations/for-cart", "categories", "brands"]);

/**
 * GET /api/catalog/<path>?<query> -- same-origin proxy for the search overlay's catalog reads, so client-side
 * search never depends on the backend's CORS settings (they differ per environment / dev port).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!ALLOWED.has(path)) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
  // The storefront language the shopper picked (nz_locale), not the browser's -- the backend localizes goal names etc. by it.
  const language = req.cookies.get("nz_locale")?.value ?? req.headers.get("accept-language") ?? "";
  const query = new URLSearchParams(req.nextUrl.searchParams);
  query.set("_lang", language.slice(0, 16)); // part of the URL so the fetch cache never serves one language's names to another
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/${path}?${query.toString()}`, {
      headers: { "Accept-Language": language },
      next: { revalidate: path === "products/search" || path.startsWith("products/recommendations") ? 15 : 300 },
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load the catalog." } }, { status: 502 });
  }
}
