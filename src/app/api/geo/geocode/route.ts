import { NextRequest, NextResponse } from "next/server";
import { backendGeo, langOf } from "@/lib/geo-locate";

/** GET /api/geo/geocode?q=&lang=&lat=&lng= → places in Uzbekistan (closest to lat/lng first). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ success: true, data: [] });
  const near = ["lat", "lng"].every((k) => Number.isFinite(Number(req.nextUrl.searchParams.get(k))))
    ? `&lat=${Number(req.nextUrl.searchParams.get("lat"))}&lng=${Number(req.nextUrl.searchParams.get("lng"))}`
    : "";
  try {
    return await backendGeo(`geocode?q=${encodeURIComponent(q)}&lang=${langOf(req.nextUrl.searchParams.get("lang"))}${near}`);
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAVAILABLE", message: "Search is unavailable." } }, { status: 503 });
  }
}
