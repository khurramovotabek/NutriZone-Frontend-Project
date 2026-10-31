"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";
import { useIsClient } from "@/hooks/useIsClient";
import MapSizeFixer from "@/components/MapSizeFixer";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/maps";
import type { StoreListItem } from "@/lib/store-api";
import MapLocateButton from "@/components/MapLocateButton";

const OPEN_COLOR = "#10b981";
const CLOSED_COLOR = "#64748b";
// Tashkent -- only used when no store has coordinates yet.
const FALLBACK_CENTER: [number, number] = [41.3111, 69.2797];

/** Same SVG pin as the single-store map, tinted per store (open = green, closed = slate). */
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="color:${color};line-height:0"><svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))"><path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.5 6.5 12 7 12.5.2.2.4.2.6 0 .5-.5 7-7 7-12.5C19.5 5.36 16.14 2 12 2Z"/><circle cx="12" cy="9.4" r="3.1" fill="white"/></svg></div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}

function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

/**
 * Every store with coordinates on one map; a pin's popup shows its status, address and a link to the store.
 * "My location" puts the customer on it and names the nearest branch with the distance and a route.
 */
export default function StoresMap({ stores }: { stores: StoreListItem[] }) {
  const t = useTranslations("stores");
  const mounted = useIsClient();
  const [map, setMap] = useState<L.Map | null>(null);
  const located = stores.filter((s) => s.latitude !== null && s.longitude !== null);
  const points = located.map((s) => [s.latitude!, s.longitude!] as [number, number]);

  if (!mounted) return <div className="h-[460px] w-full animate-pulse rounded-3xl bg-surface-2 sm:h-[560px]" aria-hidden="true" />;

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-3xl border border-border shadow-[var(--nz-glass-shadow)] sm:h-[560px]">
      <MapContainer
        // Several pins: open framed on all of them (the container already has its height, so the fit is right first time).
        {...(points.length > 1 ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [48, 48] as [number, number], maxZoom: 15 } } : { center: points[0] ?? FALLBACK_CENTER, zoom: points.length ? 15 : 11 })}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
        <MapSizeFixer />
        <MapRef onReady={setMap} />
        {located.map((store) => (
          <Marker key={store.id} position={[store.latitude!, store.longitude!]} icon={pinIcon(store.is_open_now ? OPEN_COLOR : CLOSED_COLOR)} title={store.name}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="text-sm font-bold text-slate-900">{store.name}</p>
                <p className={`mt-0.5 text-xs font-semibold ${store.is_open_now ? "text-emerald-600" : "text-slate-500"}`}>● {store.is_open_now ? t("open") : t("closed")}</p>
                {(store.address || store.city) && <p className="mt-1 text-xs text-slate-600">{[store.address, store.district, store.city].filter(Boolean).join(", ")}</p>}
                <Link href={`/store/${store.slug}`} className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold !text-white">
                  {t("viewStore")}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <MapLocateButton map={map} className="absolute right-3 top-14 z-[1000]"
        targets={located.map((s) => ({ lat: s.latitude!, lng: s.longitude!, name: s.name, href: `/store/${s.slug}` }))} />
      {/* Legend */}
      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow backdrop-blur">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: OPEN_COLOR }} />{t("open")}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CLOSED_COLOR }} />{t("closed")}</span>
      </div>
    </div>
  );
}
