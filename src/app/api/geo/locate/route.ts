import { NextRequest, NextResponse } from "next/server";
import { backendGeo, langOf } from "@/lib/geo-locate";

/** GET /api/geo/locate?lat=&lng=&lang=[&delivery=1] → city / region / district + street for a point (public, rate-limited by
 *  IP in Django); delivery=1 adds the delivery price / time for that spot and the nearest pickup branch (checkout map). */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "lat and lng are required." } }, { status: 422 });
  }
  try {
    const delivery = req.nextUrl.searchParams.get("delivery") === "1" ? "&delivery=1" : "";
    return await backendGeo(`locate?lat=${lat}&lng=${lng}&lang=${langOf(req.nextUrl.searchParams.get("lang"))}${delivery}`);
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAVAILABLE", message: "Location service is unavailable." } }, { status: 503 });
  }
}
