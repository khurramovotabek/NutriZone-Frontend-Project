"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import L from "leaflet";
import { LoaderCircle, LocateFixed, Navigation, X } from "lucide-react";
import { useGpsLocate, type LocateHelp } from "@/lib/use-gps-locate";
import { yandexRouteUrl } from "@/lib/maps";
import LocateHelpPanel from "@/components/LocateHelpPanel";

export interface MapTarget {
  lat: number;
  lng: number;
  name: string;
  href?: string;
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** < 1 km in metres, otherwise km with one decimal (StoreCard's convention). */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * "Where am I" on a map that shows branches (the stores map, a store's page): a blue dot with the GPS accuracy circle,
 * the view framed on the customer and the nearest branch, and a card with the distance and a ready Yandex route.
 * Rendered over the map (absolute), it works on the Leaflet instance handed in by the map.
 */
export default function MapLocateButton({ map, targets, className = "" }: { map: L.Map | null; targets: MapTarget[]; className?: string }) {
  const t = useTranslations("locationPicker");
  const [me, setMe] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [help, setHelp] = useState<LocateHelp | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const framedRef = useRef(false);

  const gps = useGpsLocate({
    onFix: (fix) => {
      setHelp(null);
      setDismissed(false);
      setMe({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
    },
    onError: setHelp,
  });

  const nearest = me && targets.length
    ? targets.map((s) => ({ ...s, meters: distanceMeters(me, s) })).sort((a, b) => a.meters - b.meters)[0]
    : null;

  // the dot + accuracy circle live on the map itself
  useEffect(() => {
    if (!map || !me) return;
    layerRef.current?.remove();
    const group = L.layerGroup();
    if (me.accuracy) L.circle([me.lat, me.lng], { radius: me.accuracy, color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.1, weight: 1, interactive: false }).addTo(group);
    L.circleMarker([me.lat, me.lng], { radius: 7, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1, interactive: false }).addTo(group);
    group.addTo(map);
    layerRef.current = group;
  }, [map, me]);
  useEffect(() => () => {
    layerRef.current?.remove();
  }, []);

  // frame the customer and the nearest branch once per "locate" press
  useEffect(() => {
    if (!map || !me || framedRef.current) return;
    framedRef.current = true;
    if (nearest && nearest.meters < 300_000) map.flyToBounds(L.latLngBounds([[me.lat, me.lng], [nearest.lat, nearest.lng]]), { padding: [56, 56], maxZoom: 16, duration: 0.8 });
    else map.flyTo([me.lat, me.lng], 15, { duration: 0.8 });
  }, [map, me, nearest]);

  const fab = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-surface active:scale-95";

  return (
    <>
      <button
        type="button" aria-label={t("myLocation")} title={t("myLocation")} className={`${fab} ${className}`}
        onClick={() => { framedRef.current = false; setHelp(null); void gps.start(); }}
      >
        {gps.locating ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-5 w-5" aria-hidden="true" />}
      </button>
      {help && (
        <div className="absolute inset-x-3 bottom-3 z-[1001]">
          <LocateHelpPanel help={help} onRetry={() => { setHelp(null); void gps.start(); }} onClose={() => setHelp(null)} />
        </div>
      )}
      {!help && nearest && !dismissed && (targets.length === 1 ? (
        // one branch (its own page already has route buttons): just how far it is
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-lg backdrop-blur-sm">
          {t("fromYou")}: <span className="text-primary">{formatDistance(nearest.meters)}</span>
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-3 z-[1001] flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("nearestBranch")} · <span className="whitespace-nowrap text-primary">{formatDistance(nearest.meters)}</span></p>
            <p className="truncate text-sm font-semibold text-ink">
              {nearest.href ? <Link href={nearest.href} className="hover:text-primary">{nearest.name}</Link> : nearest.name}
            </p>
          </div>
          <a href={yandexRouteUrl(nearest.lat, nearest.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white">
            <Navigation className="h-4 w-4" aria-hidden="true" />
            {t("route")}
          </a>
          <button type="button" onClick={() => setDismissed(true)} className="-m-1 p-1 text-ink-soft hover:text-ink" aria-label={t("close")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </>
  );
}
