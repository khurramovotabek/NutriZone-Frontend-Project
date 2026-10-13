/**
 * Server-only calls to the real NutriZone Geo API. Needed by
 * checkout: CheckoutCartView (Cart app) requires a real, pre-owned
 * geo.Address id -- confirmed via direct source inspection that no
 * free-text address is accepted. A real city_id (not free text) is
 * also required by CreateAddressSerializer.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export class GeoApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

/** The shopper's site language (nz_locale cookie) so region / city / district names come back in it. */
async function siteLanguage(): Promise<string> {
  try {
    const { cookies } = await import("next/headers");
    const v = (await cookies()).get("nz_locale")?.value;
    return v === "ru" || v === "en" ? v : "uz";
  } catch {
    return "uz";
  }
}

async function geoFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "Accept-Language": await siteLanguage(), ...(init.headers as Record<string, string>),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });

  // Confirmed via live testing against the real backend: a 204
  // response (e.g. DELETE /addresses/{id}) has a completely empty
  // body, not a JSON envelope -- calling .json() on it throws.
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };

  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new GeoApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export interface City {
  id: string;
  name: string;
  country_id: string;
  region_id: string;
}

interface RawCity {
  id: string;
  name: string;
  region_id: string;
}

export interface CityAncestors {
  city: { id: string; name: string };
  region: { id: string; name: string };
  country: { id: string; name: string };
}

/**
 * The real backend's City payload has no country_id field at all
 * (confirmed against the real _city_payload -- only region_id exists;
 * the full hierarchy is Country -> Region -> District -> City). This
 * was caught by a live integration test before shipping: the first
 * attempt assumed a direct country_id on City that does not exist.
 * Resolves it via the real, existing /cities/{id}/ancestors endpoint,
 * one call per city -- acceptable at this project's current scale
 * (a small, fixed set of served cities), not a high-traffic path.
 */
export async function listCities(accessToken: string): Promise<City[]> {
  const rawCities = await geoFetch<RawCity[]>("/api/v1/geo/cities?page_size=200", accessToken, { method: "GET" });
  const enriched = await Promise.all(
    rawCities.map(async (city) => {
      const ancestors = await geoFetch<CityAncestors>(`/api/v1/geo/cities/${city.id}/ancestors`, accessToken, { method: "GET" });
      return { id: city.id, name: city.name, country_id: ancestors.country.id, region_id: city.region_id };
    }),
  );
  return enriched;
}

export interface Country {
  id: string;
  code: string;
  name: string;
}

/** Real, existing `GET /countries` -- AllowAny, returns every active country. */
export async function listCountries(accessToken: string): Promise<Country[]> {
  return geoFetch<Country[]>("/api/v1/geo/countries", accessToken, { method: "GET" });
}

export interface Region {
  id: string;
  code: string;
  name: string;
  country_id: string;
}

/** Real, existing `GET /countries/{id}/regions`. */
export interface District {
  id: string;
  code: string;
  name: string;
  region_id: string;
}

/** `GET /regions/{id}/districts` -- the region's active districts (tumanlar), in the site language. */
export async function listDistricts(accessToken: string, regionId: string): Promise<District[]> {
  return geoFetch<District[]>(`/api/v1/geo/regions/${regionId}/districts`, accessToken, { method: "GET" });
}

export async function listRegions(accessToken: string, countryId: string): Promise<Region[]> {
  return geoFetch<Region[]>(`/api/v1/geo/countries/${countryId}/regions`, accessToken, { method: "GET" });
}

export interface RegionCity {
  id: string;
  name: string;
  region_id: string;
}

/**
 * Real, existing `GET /cities?filter[region_id]=` (CityListView already
 * supports this server-side filter -- confirmed directly against
 * apps/geo/interfaces/api/v1/views.py) -- lets Address Book/Checkout
 * cascade City options from the selected Region without fetching (or
 * client-side filtering) the full city list. page_size=200 (the
 * backend's own MAX_PAGE_SIZE) is passed so a region's real city list
 * is never silently truncated by the default page_size=50. No
 * country_id here -- the selected Region already carries its own
 * real country_id (see `Region` above), so a caller never needs to
 * resolve it a second time via the per-city ancestors N+1 endpoint.
 */
export async function listCitiesByRegion(accessToken: string, regionId: string): Promise<RegionCity[]> {
  const query = new URLSearchParams({ "filter[region_id]": regionId, page_size: "200" });
  const rawCities = await geoFetch<RawCity[]>(`/api/v1/geo/cities?${query.toString()}`, accessToken, { method: "GET" });
  return rawCities.map((c) => ({ id: c.id, name: c.name, region_id: c.region_id }));
}

/**
 * Real, existing `GET /cities/{id}/ancestors` -- used when editing an
 * existing saved address to resolve which Region its city belongs to
 * (Address itself only stores city_id, never region_id, matching the
 * real Database Blueprint hierarchy), so the Region dropdown can be
 * correctly pre-selected instead of defaulting to nothing.
 */
export async function getCityAncestors(accessToken: string, cityId: string): Promise<CityAncestors> {
  return geoFetch<CityAncestors>(`/api/v1/geo/cities/${cityId}/ancestors`, accessToken, { method: "GET" });
}

export interface Address {
  id: string;
  address_type: string;
  line1: string;
  line2: string | null;
  formatted_single_line: string | null;
  city_id: string;
  country_id: string;
  is_default: boolean;
  coordinate_latitude: number | null;
  coordinate_longitude: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_telegram_username: string | null;
  region_id?: string | null;
  district_id?: string | null;
  coordinate_accuracy_meters?: number | null;
  coordinate_source?: CoordinateSource | null;
  metadata?: AddressDetails;
}

/** What the courier needs beyond the street: building, podyezd, floor, flat, door code, landmark (mo'ljal). */
export interface AddressDetails {
  building_name?: string | null;
  entrance?: string | null;
  floor?: string | null;
  unit?: string | null;
  entrance_code?: string | null;
  delivery_instructions?: string | null;
}
export const ADDRESS_DETAIL_LIMITS: Record<keyof AddressDetails, number> = { building_name: 128, entrance: 16, floor: 16, unit: 16, entrance_code: 32, delivery_instructions: 500 };

/** Keeps only the known detail keys, as trimmed strings within the backend's limits (anything else is dropped). */
export function cleanAddressDetails(raw: unknown): AddressDetails | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: AddressDetails = {};
  for (const key of Object.keys(ADDRESS_DETAIL_LIMITS) as (keyof AddressDetails)[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v.trim().slice(0, ADDRESS_DETAIL_LIMITS[key]);
  }
  return out;
}

/** How a point was found -- the dashboard shows it to dispatchers next to the accuracy. */
export const COORDINATE_SOURCES = ["gps", "map_pin", "search", "link", "manual"] as const;
export type CoordinateSource = (typeof COORDINATE_SOURCES)[number] | "telegram_native_share";

/**
 * Real backend enum, confirmed directly against `AddressType`
 * (apps/geo/domain/enums.py) -- these 5 values are the only ones
 * `CreateAddressSerializer.address_type` accepts. There is no
 * "study"/"school" value; a UI offering one would be rejected 422 by
 * the real backend, so only these are exposed.
 */
export const ADDRESS_TYPES = ["residential", "office", "commercial", "warehouse", "pickup_point"] as const;
export type AddressTypeValue = (typeof ADDRESS_TYPES)[number];

export async function createAddress(
  accessToken: string,
  params: {
    addressType?: AddressTypeValue; countryId: string; cityId: string; line1: string; recipientName: string; recipientPhone: string; recipientTelegramUsername?: string;
    districtId?: string; metadata?: AddressDetails;
  },
): Promise<Address> {
  return geoFetch<Address>("/api/v1/geo/addresses", accessToken, {
    method: "POST",
    body: JSON.stringify({
      address_type: params.addressType ?? "residential", country_id: params.countryId, city_id: params.cityId, line1: params.line1,
      recipient_name: params.recipientName, recipient_phone: params.recipientPhone,
      ...(params.recipientTelegramUsername ? { recipient_telegram_username: params.recipientTelegramUsername } : {}),
      ...(params.districtId ? { district_id: params.districtId } : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  });
}

export async function assignAddressCoordinates(
  accessToken: string, addressId: string, latitude: number, longitude: number, source: CoordinateSource = "gps", accuracyMeters?: number | null,
): Promise<Address> {
  /**
   * Calls the real, existing AddressAssignCoordinatesView (POST
   * .../addresses/<id>/coordinates) -- a separate step from address
   * creation because CreateAddressSerializer itself has no lat/lng
   * fields at all (confirmed directly against the backend). "gps" is
   * passed as the source since this is always populated from the
   * browser's real Geolocation API, never typed in manually.
   */
  return geoFetch<Address>(`/api/v1/geo/addresses/${addressId}/coordinates`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ latitude, longitude, source, ...(accuracyMeters != null ? { accuracy_meters: Math.round(accuracyMeters * 10) / 10 } : {}) }),
  });
}

/**
 * Confirmed against the real backend: GET /addresses lists only the
 * current user's own addresses (AddressOwnerPermission), no owner_id
 * needs to be passed by the client.
 */
export async function listAddresses(accessToken: string): Promise<Address[]> {
  return geoFetch<Address[]>("/api/v1/geo/addresses", accessToken, { method: "GET" });
}

/**
 * Real, product-required capability: `UpdateAddressSerializer` now
 * accepts city_id/address_type/recipient_name/recipient_phone/
 * recipient_telegram_username in addition to line1/line2/postal_code
 * (confirmed directly against the backend) -- every field is
 * PATCH-like (omitted = unchanged). Coordinates are still NOT included
 * here; use the existing, separate `assignAddressCoordinates` for
 * that real, working pathway.
 */
export async function updateAddress(
  accessToken: string,
  addressId: string,
  params: Partial<{
    line1: string; line2: string | null; postalCode: string | null; cityId: string; addressType: AddressTypeValue; recipientName: string; recipientPhone: string;
    recipientTelegramUsername: string; districtId: string; metadata: AddressDetails;
  }>,
): Promise<Address> {
  const body: Record<string, unknown> = {};
  if (params.line1 !== undefined) body.line1 = params.line1;
  if (params.line2 !== undefined) body.line2 = params.line2;
  if (params.postalCode !== undefined) body.postal_code = params.postalCode;
  if (params.cityId !== undefined) body.city_id = params.cityId;
  if (params.addressType !== undefined) body.address_type = params.addressType;
  if (params.recipientName !== undefined) body.recipient_name = params.recipientName;
  if (params.recipientPhone !== undefined) body.recipient_phone = params.recipientPhone;
  if (params.recipientTelegramUsername !== undefined) body.recipient_telegram_username = params.recipientTelegramUsername;
  if (params.districtId !== undefined) body.district_id = params.districtId;
  if (params.metadata !== undefined) body.metadata = params.metadata;
  return geoFetch<Address>(`/api/v1/geo/addresses/${addressId}`, accessToken, { method: "PATCH", body: JSON.stringify(body) });
}

/**
 * Confirmed against the real backend: there is no "set default"
 * endpoint -- is_default can only be read, never set, from this API.
 * DELETE returns 204 with a null data payload.
 */
export async function deleteAddress(accessToken: string, addressId: string): Promise<void> {
  await geoFetch<null>(`/api/v1/geo/addresses/${addressId}`, accessToken, { method: "DELETE" });
}
