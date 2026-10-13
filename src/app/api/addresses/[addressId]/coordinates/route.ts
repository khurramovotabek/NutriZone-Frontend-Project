import { NextRequest, NextResponse } from "next/server";
import { COORDINATE_SOURCES, GeoApiError, assignAddressCoordinates, type CoordinateSource } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const latitude = typeof body?.latitude === "number" ? body.latitude : null;
  const longitude = typeof body?.longitude === "number" ? body.longitude : null;
  if (latitude === null || longitude === null) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A real latitude and longitude are required." } }, { status: 422 });
  }

  try {
    const source: CoordinateSource = (COORDINATE_SOURCES as readonly string[]).includes(body?.source) ? body.source : "gps";
    const accuracy = typeof body?.accuracy === "number" && body.accuracy >= 0 && body.accuracy < 100000 ? body.accuracy : null;
    const address = await assignAddressCoordinates(accessToken, addressId, latitude, longitude, source, accuracy);
    return NextResponse.json({ success: true, data: address });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not save your location." } }, { status: 500 });
  }
}
