import { NextResponse } from "next/server";
import { GeoApiError, listCountries, listRegions } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

/**
 * Real, existing `GET /countries` + `GET /countries/{id}/regions` --
 * this storefront currently serves exactly one active country
 * (confirmed against the real database: a single seeded Uzbekistan
 * row), and the Address Book/Checkout UI has no Country field of its
 * own (Region is the top-level selector, matching the task's own
 * design). Rather than fabricate a Country picker nothing asks for,
 * this resolves the first real active country server-side and returns
 * its real regions. If a second active country is ever added, this
 * route still returns 100% real data -- it simply keeps using the
 * first one returned by the backend (ordered by country code) until a
 * Country selector is explicitly requested.
 *
 * Other countries (with no regions) have since been seeded -- e.g. as
 * product origin countries -- so "first by code" became Australia and
 * the region list came back empty. Uzbekistan ("UZ") is now preferred
 * explicitly, falling back to the first country only if it's missing.
 */
const DELIVERY_COUNTRY_CODE = "UZ";
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  try {
    const countries = await listCountries(accessToken);
    const country = countries.find((c) => c.code?.toUpperCase() === DELIVERY_COUNTRY_CODE) ?? countries[0];
    if (!country) {
      return NextResponse.json({ success: true, data: [] });
    }
    const regions = await listRegions(accessToken, country.id);
    return NextResponse.json({ success: true, data: regions });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load regions." } }, { status: 500 });
  }
}
