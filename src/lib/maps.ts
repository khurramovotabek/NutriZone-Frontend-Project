/**
 * One place for every map in the storefront.
 * Tiles: Esri -- free, no key, and not blocked for this traffic (tile.openstreetmap.org answers 403 under its usage
 * policy and CARTO now demands an API key; the Dashboard maps use the same Esri source). Four looks: street map,
 * satellite, hybrid (satellite + names) and terrain.
 * Links: Yandex Maps is what people in Uzbekistan navigate with -- a point link and a ready route; Google Maps,
 * Apple Maps (opens the Maps app on an iPhone) and 2GIS as the alternatives.
 */
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

export const MAP_TILE_URL = `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`;
export const MAP_TILE_ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com">Esri</a>';

export type MapLayerKey = "street" | "satellite" | "hybrid" | "terrain";
export const MAP_LAYERS: Record<MapLayerKey, { url: string; labels?: string }> = {
  street: { url: MAP_TILE_URL },
  satellite: { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}` },
  hybrid: { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` },
  terrain: { url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` },
};
export const MAP_LAYER_KEYS = Object.keys(MAP_LAYERS) as MapLayerKey[];
const LAYER_STORAGE_KEY = "nz-map-layer";

/** The shopper's last chosen map look (remembered per browser; storage may be blocked -- then the street map). */
export function savedMapLayer(fallback: MapLayerKey = "street"): MapLayerKey {
  try {
    const v = window.localStorage.getItem(LAYER_STORAGE_KEY);
    return v && v in MAP_LAYERS ? (v as MapLayerKey) : fallback;
  } catch {
    return fallback;
  }
}
export function saveMapLayer(key: MapLayerKey): void {
  try {
    window.localStorage.setItem(LAYER_STORAGE_KEY, key);
  } catch {
    /* private mode */
  }
}

const fx = (n: number) => n.toFixed(6);

/** A pin on Yandex Maps (note: Yandex's `pt` takes longitude first). Opens the Yandex Maps app on a phone when installed. */
export function yandexPointUrl(lat: number, lng: number, zoom = 17): string {
  return `https://yandex.uz/maps/?pt=${fx(lng)},${fx(lat)}&z=${zoom}&l=map`;
}

/** A ready driving route from wherever the visitor is to the point. */
export function yandexRouteUrl(lat: number, lng: number): string {
  return `https://yandex.uz/maps/?rtext=~${fx(lat)},${fx(lng)}&rtt=auto`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${fx(lat)},${fx(lng)}`;
}

/** Apple Maps -- on iPhone / iPad / Mac this opens the Maps app with the pin and its name. */
export function appleMapsUrl(lat: number, lng: number, label?: string): string {
  return `https://maps.apple.com/?ll=${fx(lat)},${fx(lng)}&q=${encodeURIComponent(label || "NutriZone")}`;
}

/** 2GIS (popular in Uzbekistan for building entrances): longitude first. */
export function twoGisUrl(lat: number, lng: number): string {
  return `https://2gis.uz/geo/${fx(lng)},${fx(lat)}`;
}

/** Telegram's share screen with the place name and the Yandex link. */
export function telegramShareUrl(lat: number, lng: number, label?: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(yandexPointUrl(lat, lng))}&text=${encodeURIComponent(label || "")}`;
}

/** What a shared location reads like: the name, then a link for each app (people open the one they have). */
export function shareText(lat: number, lng: number, label?: string): string {
  return [label, `Yandex: ${yandexPointUrl(lat, lng)}`, `Google: ${googleMapsUrl(lat, lng)}`, `Apple: ${appleMapsUrl(lat, lng, label)}`, `${fx(lat)}, ${fx(lng)}`]
    .filter(Boolean)
    .join("\n");
}

export function coordinatesText(lat: number, lng: number): string {
  return `${fx(lat)}, ${fx(lng)}`;
}
