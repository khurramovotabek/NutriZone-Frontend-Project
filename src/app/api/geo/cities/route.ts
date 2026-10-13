import { NextRequest, NextResponse } from "next/server";
import { GeoApiError, listCities, listCitiesByRegion } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const regionId = req.nextUrl.searchParams.get("regionId");

  try {
    // Real, existing `filter[region_id]` support on CityListView --
    // used by the Region -> City cascade in Address Book/Checkout so
    // the City dropdown only ever shows cities inside the selected
    // Region. With no `regionId`, falls back to the original
    // unfiltered list (still real data) for any caller that hasn't
    // adopted the region-scoped flow yet.
    const cities = regionId ? await listCitiesByRegion(accessToken, regionId) : await listCities(accessToken);
    return NextResponse.json({ success: true, data: cities });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load cities." } }, { status: 500 });
  }
}
