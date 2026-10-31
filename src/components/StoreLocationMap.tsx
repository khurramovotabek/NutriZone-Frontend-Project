"use client";

import { useIsClient } from "@/hooks/useIsClient";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/maps";
import MapSizeFixer from "@/components/MapSizeFixer";
import MapLinks from "@/components/MapLinks";
import MapLocateButton from "@/components/MapLocateButton";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Real, previously-missing capability: `store.latitude`/`longitude`
 * already existed on `StoreDetail` and were only ever used to build an
 * external `google.com/maps?q=` link -- no map was ever rendered on
 * the page itself. This is the first map in the app (confirmed: no
 * map library existed anywhere in the frontend before this), built on
 * the standard, free OpenStreetMap raster tile server -- no Google
 * Maps billing account or API key exists in this project, and none
 * should be required just to show a store pin.
 *
 * Live-verified switch away from CARTO's basemaps.cartocdn.com: that
 * endpoint (previously used here) now returns a watermarked "API KEY
 * REQUIRED" placeholder tile for every request regardless of referrer
 * -- confirmed via direct curl, not a sandbox/tunnel-specific
 * artifact -- so it silently stopped being a usable free tile source.
 * tile.openstreetmap.org has no dark-tile variant of its own; rather
 * than fabricate a themed look this provider doesn't offer, the map
 * uses its one real style regardless of site theme. Attribution is
 * kept visible (Leaflet's default bottom-right control) per OSM's own
 * usage policy -- never hidden.
 *
 * A custom `L.divIcon` (a plain SVG pin tinted with `--nz-primary`)
 * replaces Leaflet's default marker image entirely, which sidesteps
 * the well-known bundler/default-marker-path breakage (`L.Icon.Default`
 * resolves its image URLs relative to the page, not the bundle) rather
 * than patching around it.
 */

const PIN_HTML = `
<div style="color: var(--nz-primary); line-height: 0;">
  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
    <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.5 6.5 12 7 12.5.2.2.4.2.6 0 .5-.5 7-7 7-12.5C19.5 5.36 16.14 2 12 2Z"/>
    <circle cx="12" cy="9.4" r="3.1" fill="white"/>
  </svg>
</div>`;

const storeIcon = L.divIcon({
  html: PIN_HTML,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 32],
  popupAnchor: [0, -30],
});

function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export default function StoreLocationMap({
  latitude,
  longitude,
  storeName,
  address,
}: {
  latitude: number;
  longitude: number;
  storeName: string;
  address: string;
  /** Kept for callers; the links now come from MapLinks (Yandex / route / Google / share). */
  mapUrl?: string;
}) {
  const mounted = useIsClient();
  const [map, setMap] = useState<L.Map | null>(null);

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-2 sm:h-72" aria-hidden="true" />;
  }

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-border sm:h-72">
      <MapContainer
        center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full" style={{ height: "100%", width: "100%" }}
        // a small map inside a phone page must not swallow the page scroll (pinch still zooms and moves it)
        dragging={!L.Browser.mobile}
      >
        <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
        <MapSizeFixer />
        <MapRef onReady={setMap} />
        <Marker position={[latitude, longitude]} icon={storeIcon}>
          <Popup>
            <span className="font-semibold">{storeName}</span>
            {address && (
              <>
                <br />
                {address}
              </>
            )}
          </Popup>
        </Marker>
      </MapContainer>
      <MapLocateButton map={map} className="absolute right-3 top-3 z-[1000]" targets={[{ lat: latitude, lng: longitude, name: storeName }]} />
      <MapLinks latitude={latitude} longitude={longitude} label={storeName} className="absolute bottom-3 left-3 right-3 z-[1000] justify-end" />
    </div>
  );
}
