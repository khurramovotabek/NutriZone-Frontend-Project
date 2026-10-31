"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Expand, Layers, Link2, LoaderCircle, LocateFixed, Search, X } from "lucide-react";
import { useIsClient } from "@/hooks/useIsClient";
import { MAP_LAYER_KEYS, MAP_LAYERS, MAP_TILE_ATTRIBUTION, saveMapLayer, savedMapLayer, type MapLayerKey } from "@/lib/maps";
import type { CoordinateSource } from "@/lib/geo-api";
import type { GeocodeResult } from "@/lib/geo-locate";
import MapSizeFixer from "@/components/MapSizeFixer";
import MapLinks from "@/components/MapLinks";
import LocateHelpPanel from "@/components/LocateHelpPanel";
import { useGpsLocate, type LocateHelp } from "@/lib/use-gps-locate";

const LocationPickerFullscreen = dynamic(() => import("@/components/LocationPickerFullscreen"), { ssr: false });

// Phones and tablets: a finger on a small map is imprecise and fights the page scroll, so the map there is a preview
// that opens the full-screen picker (pin fixed in the centre, the map moves under it).
const TOUCH_QUERY = "(max-width: 767px), (pointer: coarse)";
function subscribeTouch(cb: () => void) {
  const mq = window.matchMedia(TOUCH_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * The map location picker shared by every feature that sets a real point (address book, checkout, store profile).
 * Five ways to say "here": click the map, drag the pin, "use my location" (GPS -- keeps listening a few seconds and
 * keeps the most precise fix, with its accuracy circle), search a place or street, or paste a Yandex / Google /
 * Apple / 2GIS link or "41.31, 69.27". Four map looks (map · satellite · hybrid · terrain), remembered per browser.
 * The caller learns how each point was found (`source`) and how precise a GPS fix was (`accuracy`, metres).
 * On phones the small map is a preview: tapping it -- or "use my location" -- opens LocationPickerFullscreen, where the
 * customer moves the map under a fixed pin and sees the street / house under it before confirming.
 *
 * The caller still passes its own copy for the hint / empty / coordinates / locate texts (several namespaces use
 * it); the picker's own controls use the "locationPicker" messages.
 */

const PIN_HTML = `
<div style="color: var(--nz-primary); line-height: 0;">
  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
    <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.5 6.5 12 7 12.5.2.2.4.2.6 0 .5-.5 7-7 7-12.5C19.5 5.36 16.14 2 12 2Z"/>
    <circle cx="12" cy="9.4" r="3.1" fill="white"/>
  </svg>
</div>`;

const locationIcon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [34, 34], iconAnchor: [17, 32] });

export interface PickMeta {
  source: CoordinateSource;
  accuracy?: number | null;
  /**
   * false while GPS is still refining (the pin moves as better fixes arrive); true / absent for the point to keep.
   * Callers that save immediately (store profile) save only final points.
   */
  final?: boolean;
}

function ClickToPlace({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyToController({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (target && target.nonce !== lastNonce.current) {
      lastNonce.current = target.nonce;
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

/** Page scrolling over a form map must not zoom it: the wheel zooms only after the map was clicked, until the pointer leaves. */
function WheelOnFocus() {
  const map = useMap();
  useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
}

/** Hands the map instance up so search can bias results to what's on screen. */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number, meta?: PickMeta) => void;
  hintText: string;
  emptyText: string;
  coordinatesText: string;
  /** GPS accuracy (metres, 1-sigma) shown honestly with a circle: a laptop's Wi-Fi fix can be hundreds of metres off. */
  accuracyText?: (meters: number) => string;
  locateLabel: string;
  locatingLabel: string;
  onLocateUnsupported: () => void;
  /** PERMISSION_DENIED -- the picker also shows how to allow it; the caller may show its own message too. */
  onLocateDenied: () => void;
  onLocateUnavailable?: () => void;
  onLocateTimeout?: () => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  heightClassName?: string;
  /** Search + paste-a-link + map looks (on by default). */
  tools?: boolean;
  /** Label for the share menu (e.g. the address line). */
  shareLabel?: string;
}

const TASHKENT_CENTER: [number, number] = [41.2995, 69.2401];

export default function LocationPicker({
  latitude, longitude, onChange, hintText, emptyText, coordinatesText, accuracyText, locateLabel, locatingLabel,
  onLocateUnsupported, onLocateDenied, onLocateUnavailable, onLocateTimeout,
  defaultCenter = TASHKENT_CENTER, defaultZoom = 11, heightClassName = "h-72", tools = true, shareLabel,
}: LocationPickerProps) {
  const t = useTranslations("locationPicker");
  const locale = useLocale();
  const mounted = useIsClient();
  const touch = useSyncExternalStore(subscribeTouch, () => window.matchMedia(TOUCH_QUERY).matches, () => false);
  const [fullscreen, setFullscreen] = useState<null | { autoLocate: boolean }>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [layer, setLayer] = useState<MapLayerKey>("street");
  const [layersOpen, setLayersOpen] = useState(false);
  const [help, setHelp] = useState<LocateHelp | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const firstFixRef = useRef(true);
  // only the last GPS fix this picker produced shows an accuracy circle -- a click / drag / search has none
  const lastGpsCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  const gpsLocate = useGpsLocate({
    onFix: (fix) => {
      lastGpsCoordRef.current = { lat: fix.lat, lng: fix.lng };
      setAccuracy(fix.accuracy);
      onChange(fix.lat, fix.lng, { source: "gps", accuracy: fix.accuracy, final: fix.final });
      if (firstFixRef.current) {
        firstFixRef.current = false;
        setFlyTarget((prev) => ({ lat: fix.lat, lng: fix.lng, nonce: (prev?.nonce ?? 0) + 1 }));
      }
    },
    onError: (h) => {
      setHelp(h);
      if (h === "unsupported") onLocateUnsupported();
      else if (h === "denied" || h === "tgDenied") onLocateDenied();
      else if (h === "timeout") (onLocateTimeout ?? onLocateDenied)();
      else (onLocateUnavailable ?? onLocateDenied)();
    },
  });

  useEffect(() => setLayer(savedMapLayer()), []); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only preference
  useEffect(() => {
    const gps = lastGpsCoordRef.current;
    if (!(gps != null && latitude === gps.lat && longitude === gps.lng)) setAccuracy(null);
  }, [latitude, longitude]);

  // search as you type (debounced); results come closest to what's on screen first
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      const c = mapRef.current?.getCenter();
      fetch(`/api/geo/geocode?q=${encodeURIComponent(q)}&lang=${locale}${c ? `&lat=${c.lat}&lng=${c.lng}` : ""}`)
        .then((r) => r.json())
        .then((b) => setResults(b?.success ? b.data : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 380);
    return () => window.clearTimeout(timer);
  }, [query, locale]);

  if (!mounted) {
    return <div className={`${heightClassName} w-full animate-pulse rounded-2xl bg-surface-2`} aria-hidden="true" />;
  }

  const hasLocation = latitude != null && longitude != null;
  const center: [number, number] = hasLocation ? [latitude, longitude] : defaultCenter;
  const fly = (lat: number, lng: number) => setFlyTarget((prev) => ({ lat, lng, nonce: (prev?.nonce ?? 0) + 1 }));

  function pick(lat: number, lng: number, meta: PickMeta, flyTo = false) {
    if (meta.source !== "gps") {
      lastGpsCoordRef.current = null;
      gpsLocate.stop();
    }
    onChange(lat, lng, meta);
    if (flyTo) fly(lat, lng);
  }

  function handleLocate() {
    setHelp(null);
    if (touch) {
      setFullscreen({ autoLocate: true }); // see it, correct it, confirm it -- all on the big map
      return;
    }
    firstFixRef.current = true;
    void gpsLocate.start();
  }

  async function handleLink() {
    if (!link.trim()) return;
    setLinkBusy(true);
    setLinkError(false);
    try {
      const res = await fetch("/api/geo/parse-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: link }) });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setLinkError(true);
        return;
      }
      pick(body.data.latitude, body.data.longitude, { source: "link" }, true);
      setLink("");
      setLinkOpen(false);
    } catch {
      setLinkError(true);
    } finally {
      setLinkBusy(false);
    }
  }

  const locating = gpsLocate.locating;
  const quality = accuracy == null ? null : accuracy <= 30 ? "good" : accuracy <= 150 ? "fair" : "poor";
  const qualityClass = { good: "text-emerald-600 dark:text-emerald-400", fair: "text-amber-600 dark:text-amber-400", poor: "text-red-600 dark:text-red-400" };
  const def = MAP_LAYERS[layer];
  const overlay = "border border-border bg-surface/95 backdrop-blur-sm";
  const chip = `${overlay} flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink shadow-lg transition-colors hover:text-primary disabled:opacity-60`;

  return (
    <div className="space-y-2">
      <button
        type="button" onClick={handleLocate} aria-live="polite" title={locateLabel}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white active:scale-[0.99]"
      >
        {locating ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4.5 w-4.5" aria-hidden="true" />}
        <span className="truncate">{locating ? (accuracy != null ? t("improving", { meters: Math.round(accuracy) }) : locatingLabel) : t("locateCta")}</span>
        {locating && <X className="h-4 w-4 opacity-70" aria-label={t("stop")} />}
      </button>
      {tools && (
        <div className="relative flex gap-2">
          <label className="nz-glass-input flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2">
            {searching ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-ink-soft" aria-hidden="true" /> : <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />}
            <input
              type="search" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 3) setResults(null); }}
              placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); if (e.key === "Escape") setResults(null); }}
            />
          </label>
          <button type="button" onClick={() => { setLinkOpen((v) => !v); setLinkError(false); }} className="nz-glass-input flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-ink hover:text-primary" aria-expanded={linkOpen}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("pasteLink")}</span>
          </button>
          {results && query.trim().length >= 3 && (
            <div className="absolute left-0 right-0 top-full z-[1200] mt-1 max-h-72 overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
              {results.length === 0 && !searching && <p className="px-3 py-2 text-sm text-ink-soft">{t("noResults")}</p>}
              {results.map((r, i) => (
                <button key={`${r.lat},${r.lng},${i}`} type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2"
                  onClick={() => { pick(r.lat, r.lng, { source: "search" }, true); setResults(null); setQuery(r.title); }}>
                  <span className="block text-sm font-semibold text-ink">{r.title}</span>
                  {r.subtitle && <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {tools && linkOpen && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t("linkPlaceholder")} aria-label={t("linkPlaceholder")} autoFocus
              className="nz-glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLink(); } }}
            />
            <button type="button" onClick={handleLink} disabled={linkBusy || !link.trim()} className="rounded-xl bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50">
              {linkBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : t("linkApply")}
            </button>
          </div>
          <p className={`text-xs ${linkError ? "text-red-600 dark:text-red-400" : "text-ink-soft"}`}>{linkError ? t("linkError") : t("linkHint")}</p>
        </div>
      )}

      <div className={`relative ${heightClassName} w-full overflow-hidden rounded-2xl border border-border`}>
        <MapContainer
          center={center} zoom={hasLocation ? 16 : defaultZoom} scrollWheelZoom={false} className="h-full w-full" style={{ height: "100%", width: "100%" }}
          // on a phone the small map is only a preview -- it must not swallow the page scroll
          dragging={!touch} touchZoom={!touch} doubleClickZoom={!touch} zoomControl={!touch} keyboard={!touch}
        >
          <TileLayer key={layer} url={def.url} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
          {def.labels && <TileLayer key={`${layer}-labels`} url={def.labels} maxZoom={19} />}
          <MapSizeFixer />
          {!touch && <WheelOnFocus />}
          <MapRef onReady={(m) => { mapRef.current = m; }} />
          {!touch && <ClickToPlace onChange={(lat, lng) => pick(lat, lng, { source: "map_pin" })} />}
          <FlyToController target={flyTarget} />
          {hasLocation && accuracy != null && (
            <Circle center={[latitude, longitude]} radius={accuracy} pathOptions={{ color: "var(--nz-primary)", fillColor: "var(--nz-primary)", fillOpacity: 0.12, weight: 1 }} />
          )}
          {hasLocation && (
            <Marker
              position={[latitude, longitude]} icon={locationIcon} draggable={!touch}
              eventHandlers={{ dragend: (e) => { const pos = (e.target as L.Marker).getLatLng(); pick(pos.lat, pos.lng, { source: "map_pin" }); } }}
            />
          )}
        </MapContainer>

        {touch ? (
          <button type="button" onClick={() => setFullscreen({ autoLocate: false })} className="absolute inset-0 z-[900] flex items-end justify-center bg-transparent pb-3" aria-label={t("openFullscreen")}>
            <span className={`${chip} px-4 py-2.5 text-sm`}>
              <Expand className="h-4 w-4" aria-hidden="true" />
              {hasLocation ? t("adjustOnMap") : t("openFullscreen")}
            </span>
          </button>
        ) : (
          <>
            {!hasLocation && (
              <div className={`${overlay} pointer-events-none absolute left-1/2 top-3 z-[1000] w-max max-w-[calc(100%-8.5rem)] -translate-x-1/2 rounded-2xl px-3.5 py-1.5 text-center text-xs font-medium text-ink shadow-lg`}>{hintText}</div>
            )}
            {tools && (
              <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
                <button type="button" onClick={() => setLayersOpen((v) => !v)} className={chip} aria-expanded={layersOpen} aria-label={t("layers")}>
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t(`layer.${layer}`)}</span>
                </button>
                {layersOpen && (
                  <div className={`${overlay} w-40 rounded-2xl p-1.5 shadow-xl`}>
                    {MAP_LAYER_KEYS.map((k) => (
                      <button key={k} type="button" onClick={() => { setLayer(k); saveMapLayer(k); setLayersOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${k === layer ? "bg-primary-soft font-semibold text-primary" : "text-ink hover:bg-surface-2"}`}>
                        {t(`layer.${k}`)}
                        {k === layer && <Check className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-3 right-3 z-[1000] flex gap-2">
              <button type="button" onClick={() => setFullscreen({ autoLocate: false })} className={chip} aria-label={t("openFullscreen")} title={t("openFullscreen")}>
                <Expand className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      {help && <LocateHelpPanel help={help} onRetry={handleLocate} onClose={() => setHelp(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">{hasLocation ? coordinatesText : emptyText}</p>
        {hasLocation && <MapLinks latitude={latitude!} longitude={longitude!} label={shareLabel} compact />}
      </div>
      {hasLocation && accuracy != null && accuracyText && quality && (
        <p className={`text-xs font-medium ${qualityClass[quality]}`}>
          {accuracyText(Math.round(accuracy))} · {t(`quality.${quality}`)}
        </p>
      )}
      {fullscreen && (
        <LocationPickerFullscreen
          initial={hasLocation ? { lat: latitude!, lng: longitude! } : null}
          defaultCenter={defaultCenter}
          autoLocate={fullscreen.autoLocate}
          onConfirm={(lat, lng, meta) => {
            lastGpsCoordRef.current = meta.source === "gps" ? { lat, lng } : null;
            setAccuracy(meta.source === "gps" ? meta.accuracy ?? null : null);
            onChange(lat, lng, meta);
            fly(lat, lng);
          }}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}
