import { NextRequest, NextResponse } from "next/server";
import { GeoApiError, listDistricts } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

/** GET /api/geo/districts?regionId= → the region's districts (tumanlar) for the address form. */
export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const regionId = req.nextUrl.searchParams.get("regionId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(regionId)) return NextResponse.json({ success: true, data: [] });
  try {
    return NextResponse.json({ success: true, data: await listDistricts(accessToken, regionId) });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load districts." } }, { status: 500 });
  }
}
