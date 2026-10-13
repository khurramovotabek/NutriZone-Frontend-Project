/**
 * Location detection shared by the address form and its proxy routes (backend: apps/geo/infrastructure/gateways/geocoder.py).
 *
 *   locate(lat, lng)   → our city / region / country / district ids + street and house (OpenStreetMap)
 *   geocode(q)         → places in Uzbekistan to pick on the map ("Chorsu", "Amir Temur 15")
 *   parseLink(text)    → coordinates from a Yandex / Google / Apple / 2GIS link (short links too) or "41.31, 69.27"
 */
import { forwardedForHeader } from "@/lib/client-ip";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface PlaceRef {
  id: string;
  name: string;
}

export interface LocateResult {
  latitude: number;
  longitude: number;
  in_uzbekistan: boolean;
  in_service_area: boolean;
  distance_km: number | null;
  city: PlaceRef | null;
  region: PlaceRef | null;
  country: (PlaceRef & { code: string }) | null;
  district: PlaceRef | null;
  street: string;
  house: string;
  label: string;
  postcode: string;
}

export interface GeocodeResult {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  kind: string;
}

/** Server-side: one call to the backend's public geo endpoint, forwarding the shopper's IP (per-IP rate limit). */
export async function backendGeo(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}/api/v1/geo/locations/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(await forwardedForHeader()), ...(init.headers as Record<string, string>) },
    cache: "no-store",
  });
  const body = await res.text();
  return new Response(body || "{}", { status: res.status, headers: { "Content-Type": "application/json" } });
}

export const LANGS = ["uz", "ru", "en"] as const;
export function langOf(value: string | null): string {
  return value && (LANGS as readonly string[]).includes(value) ? value : "uz";
}
