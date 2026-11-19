import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

/**
 * Product feeds on the shop's own domain (Google Merchant Center and Yandex require the feed and the product links
 * on the verified site): /feeds/google.xml (Uzbek), /feeds/google-ru.xml, /feeds/google-en.xml, /feeds/yandex.xml
 * (Russian), /feeds/yandex-uz.xml. Built by the backend (apps/products/infrastructure/product_feed.py, cached an hour).
 */
const FEEDS: Record<string, { kind: "google" | "yandex"; locale: "uz" | "ru" | "en" }> = {
  "google.xml": { kind: "google", locale: "uz" },
  "google-ru.xml": { kind: "google", locale: "ru" },
  "google-en.xml": { kind: "google", locale: "en" },
  "yandex.xml": { kind: "yandex", locale: "ru" },
  "yandex-uz.xml": { kind: "yandex", locale: "uz" },
};

export const dynamic = "force-dynamic"; // ~2 MB in production: over Next's fetch-cache item limit; the backend caches it

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const feed = FEEDS[(await params).file];
  if (!feed) return new NextResponse("Not found", { status: 404 });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/products/feeds/${feed.kind}.xml?locale=${feed.locale}`, { cache: "no-store" });
    if (!res.ok) return new NextResponse("Feed unavailable", { status: 503, headers: { "Retry-After": "600" } });
    return new NextResponse(await res.text(), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800, s-maxage=3600" } });
  } catch {
    return new NextResponse("Feed unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
