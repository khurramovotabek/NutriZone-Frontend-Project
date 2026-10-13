import { NextResponse } from "next/server";
import { GeoApiError, getCityAncestors } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

/** Real, existing `GET /cities/{id}/ancestors` -- lets the Address edit form resolve an existing address's Region from its stored city_id. */
export async function GET(_req: Request, { params }: { params: Promise<{ cityId: string }> }) {
  const { cityId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  try {
    const ancestors = await getCityAncestors(accessToken, cityId);
    return NextResponse.json({ success: true, data: ancestors });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not resolve this city's region." } }, { status: 500 });
  }
}
