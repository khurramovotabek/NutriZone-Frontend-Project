"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Layers, Link2, LoaderCircle, Navigation, Search, ShieldAlert, X } from "lucide-react";
import { useIsClient } from "@/hooks/useIsClient";
import { MAP_LAYER_KEYS, MAP_LAYERS, MAP_TILE_ATTRIBUTION, saveMapLayer, savedMapLayer, type MapLayerKey } from "@/lib/maps";
import type { CoordinateSource } from "@/lib/geo-api";
import type { GeocodeResult } from "@/lib/geo-locate";
import MapSizeFixer from "@/components/MapSizeFixer";
import MapLinks from "@/components/MapLinks";

/**
 * The map location picker shared by every feature that sets a real point (address book, checkout, store profile).
 * Five ways to say "here": click the map, drag the pin, "use my location" (GPS -- keeps listening a few seconds and
 * keeps the most precise fix, with its accuracy circle), search a place or street, or paste a Yandex / Google /
 * Apple / 2GIS link or "41.31, 69.27". Four map looks (map · satellite · hybrid · terrain), remembered per browser.
 * The caller learns how each point was found (`source`) and how precise a GPS fix was (`accuracy`, metres).
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

const GOOD_ACCURACY_M = 20; // stop listening once a fix is this precise
const LISTEN_MS = 9000; // ...or after this long, keeping the best fix

export interface PickMeta {
  source: CoordinateSource;
  accuracy?: number | null;
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
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [layer, setLayer] = useState<MapLayerKey>("street");
  const [layersOpen, setLayersOpen] = useState(false);
  const [help, setHelp] = useState<"denied" | "insecure" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  // only the last GPS fix this picker produced shows an accuracy circle -- a click / drag / search has none
  const lastGpsCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => setLayer(savedMapLayer()), []); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only preference
  useEffect(() => {
    const gps = lastGpsCoordRef.current;
    if (!(gps != null && latitude === gps.lat && longitude === gps.lng)) setAccuracy(null);
  }, [latitude, longitude]);
  useEffect(() => () => stopListening(), []);

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
      stopListening();
    }
    onChange(lat, lng, meta);
    if (flyTo) fly(lat, lng);
  }

  function stopListening() {
    if (watchRef.current != null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchRef.current);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    watchRef.current = null;
    timerRef.current = null;
    setLocating(false);
  }

  async function handleLocate() {
    if (locating) {
      stopListening();
      return;
    }
    setHelp(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onLocateUnsupported();
      return;
    }
    if (!window.isSecureContext) {
      setHelp("insecure");
      onLocateUnavailable?.();
      return;
    }
    try {
      const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (status?.state === "denied") {
        setHelp("denied");
        onLocateDenied();
        return;
      }
    } catch {
      /* Permissions API missing (older Safari) -- just ask */
    }
    setLocating(true);
    let best: GeolocationPosition | null = null;
    let first = true;
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (best && position.coords.accuracy >= best.coords.accuracy) return; // keep the most precise fix
        best = position;
        const { latitude: lat, longitude: lng, accuracy: acc } = position.coords;
        lastGpsCoordRef.current = { lat, lng };
        setAccuracy(acc);
        onChange(lat, lng, { source: "gps", accuracy: acc });
        if (first) {
          fly(lat, lng);
          first = false;
        }
        if (acc <= GOOD_ACCURACY_M) stopListening();
      },
      (error) => {
        if (best) {
          stopListening(); // a later failure after a good fix: keep what we have
          return;
        }
        stopListening();
        if (error.code === error.PERMISSION_DENIED) {
          setHelp("denied");
          onLocateDenied();
        } else if (error.code === error.TIMEOUT) {
          (onLocateTimeout ?? onLocateDenied)();
        } else {
          (onLocateUnavailable ?? onLocateDenied)();
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    timerRef.current = window.setTimeout(() => {
      if (best) stopListening();
    }, LISTEN_MS);
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

  const quality = accuracy == null ? null : accuracy <= 30 ? "good" : accuracy <= 150 ? "fair" : "poor";
  const qualityClass = { good: "text-emerald-600 dark:text-emerald-400", fair: "text-amber-600 dark:text-amber-400", poor: "text-red-600 dark:text-red-400" };
  const def = MAP_LAYERS[layer];
  const overlay = "border border-border bg-surface/95 backdrop-blur-sm";
  const chip = `${overlay} flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink shadow-lg transition-colors hover:text-primary disabled:opacity-60`;

  return (
    <div className="space-y-2">
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
        <MapContainer center={center} zoom={hasLocation ? 16 : defaultZoom} scrollWheelZoom={false} className="h-full w-full" style={{ height: "100%", width: "100%" }}>
          <TileLayer key={layer} url={def.url} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
          {def.labels && <TileLayer key={`${layer}-labels`} url={def.labels} maxZoom={19} />}
          <MapSizeFixer />
          <WheelOnFocus />
          <MapRef onReady={(m) => { mapRef.current = m; }} />
          <ClickToPlace onChange={(lat, lng) => pick(lat, lng, { source: "map_pin" })} />
          <FlyToController target={flyTarget} />
          {hasLocation && accuracy != null && (
            <Circle center={[latitude, longitude]} radius={accuracy} pathOptions={{ color: "var(--nz-primary)", fillColor: "var(--nz-primary)", fillOpacity: 0.12, weight: 1 }} />
          )}
          {hasLocation && (
            <Marker
              position={[latitude, longitude]} icon={locationIcon} draggable
              eventHandlers={{ dragend: (e) => { const pos = (e.target as L.Marker).getLatLng(); pick(pos.lat, pos.lng, { source: "map_pin" }); } }}
            />
          )}
        </MapContainer>

        {!hasLocation && (
          <div className={`${overlay} pointer-events-none absolute left-1/2 top-3 z-[1000] w-max max-w-[calc(100%-8.5rem)] -translate-x-1/2 rounded-2xl px-3.5 py-1.5 text-center text-xs font-medium text-ink shadow-lg`}>{hintText}</div>
        )}

        {tools && (
          <div className="absolute right-3 top-3 z-[1000]">
            <button type="button" onClick={() => setLayersOpen((v) => !v)} className={chip} aria-expanded={layersOpen} aria-label={t("layers")}>
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t(`layer.${layer}`)}</span>
            </button>
            {layersOpen && (
              <div className={`${overlay} absolute right-0 top-full mt-1.5 w-40 rounded-2xl p-1.5 shadow-xl`}>
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

        <button type="button" onClick={handleLocate} className={`${chip} absolute bottom-3 right-3 z-[1000] px-3.5`} aria-live="polite">
          {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" /> : <Navigation className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
          {locating ? (accuracy != null ? t("improving", { meters: Math.round(accuracy) }) : locatingLabel) : locateLabel}
          {locating && <X className="h-3.5 w-3.5 opacity-60" aria-label={t("stop")} />}
        </button>
      </div>

      {help && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-ink">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="font-semibold">{help === "insecure" ? t("insecureTitle") : t("deniedTitle")}</p>
            {help === "insecure" ? (
              <p className="text-ink-muted">{t("insecureText")}</p>
            ) : (
              <ul className="list-disc space-y-0.5 pl-4 text-ink-muted">
                <li>{t("deniedChrome")}</li>
                <li>{t("deniedIphone")}</li>
                <li>{t("deniedTelegram")}</li>
              </ul>
            )}
            <p className="text-ink-muted">{t("deniedAlternative")}</p>
          </div>
          <button type="button" onClick={() => setHelp(null)} className="self-start text-ink-soft hover:text-ink" aria-label={t("close")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">{hasLocation ? coordinatesText : emptyText}</p>
        {hasLocation && <MapLinks latitude={latitude!} longitude={longitude!} label={shareLabel} compact />}
      </div>
      {hasLocation && accuracy != null && accuracyText && quality && (
        <p className={`text-xs font-medium ${qualityClass[quality]}`}>
          {accuracyText(Math.round(accuracy))} · {t(`quality.${quality}`)}
        </p>
      )}
    </div>
  );
}
