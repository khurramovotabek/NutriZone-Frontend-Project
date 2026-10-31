"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Check, Layers, Link2, LoaderCircle, LocateFixed, MapPin, Minus, Plus, Search, TriangleAlert } from "lucide-react";
import { MAP_LAYER_KEYS, MAP_LAYERS, MAP_TILE_ATTRIBUTION, saveMapLayer, savedMapLayer, type MapLayerKey } from "@/lib/maps";
import type { CoordinateSource } from "@/lib/geo-api";
import type { GeocodeResult, LocateResult } from "@/lib/geo-locate";
import { useGpsLocate, type LocateHelp } from "@/lib/use-gps-locate";
import { haptic } from "@/lib/telegram-webapp";
import MapSizeFixer from "@/components/MapSizeFixer";
import LocateHelpPanel from "@/components/LocateHelpPanel";
import type { PickMeta } from "@/components/LocationPicker";

/**
 * The phone way to set an exact point (Yandex Go / Uber style): a full-screen map with the pin fixed in the centre --
 * the customer moves the map under it, which is far more precise with a finger than tapping a small map. Under the pin
 * the street / house / district found for it (/api/geo/locate), so they see they are at the right door before
 * confirming. "My location" flies there and draws the GPS accuracy circle; a weak fix asks them to move the pin.
 * Android back / Telegram's back button close it (a history entry), the page underneath does not scroll.
 */

const PIN_SVG = (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}>
    <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.5 6.5 12 7 12.5.2.2.4.2.6 0 .5-.5 7-7 7-12.5C19.5 5.36 16.14 2 12 2Z" />
    <circle cx="12" cy="9.4" r="3.1" fill="white" />
  </svg>
);

function zoomFor(accuracy: number | null): number {
  if (accuracy == null || accuracy <= 30) return 18;
  if (accuracy <= 100) return 17;
  if (accuracy <= 300) return 16;
  return 15;
}

function CenterTracker({ onMoveStart, onMoveEnd, onDrag }: { onMoveStart: () => void; onMoveEnd: (lat: number, lng: number) => void; onDrag: () => void }) {
  const map = useMapEvents({
    movestart: onMoveStart,
    dragstart: onDrag,
    moveend: () => {
      const c = map.getCenter();
      onMoveEnd(c.lat, c.lng);
    },
  });
  return null;
}

function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export interface LocationPickerFullscreenProps {
  initial: { lat: number; lng: number } | null;
  defaultCenter: [number, number];
  /** Start "my location" as soon as it opens (the customer tapped "use my location"). */
  autoLocate: boolean;
  onConfirm: (lat: number, lng: number, meta: PickMeta) => void;
  onClose: () => void;
}

export default function LocationPickerFullscreen({ initial, defaultCenter, autoLocate, onConfirm, onClose }: LocationPickerFullscreenProps) {
  const t = useTranslations("locationPicker");
  const locale = useLocale();
  const [layer, setLayer] = useState<MapLayerKey>(() => savedMapLayer("hybrid")); // the street map has little detail up close in Uzbekistan; the roof of your own building is easy to find
  const [layersOpen, setLayersOpen] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(initial ?? { lat: defaultCenter[0], lng: defaultCenter[1] });
  const [moving, setMoving] = useState(false);
  const [placed, setPlaced] = useState(initial != null); // false until the customer (or GPS / search) chose somewhere
  const [place, setPlace] = useState<LocateResult | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [help, setHelp] = useState<LocateHelp | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const [source, setSource] = useState<CoordinateSource>("map_pin");

  const goTo = useCallback((lat: number, lng: number, zoom: number, source: CoordinateSource) => {
    setSource(source);
    setPlaced(true);
    const map = mapRef.current;
    if (map) map.flyTo([lat, lng], Math.max(zoom, source === "gps" ? 0 : map.getZoom()), { duration: 0.7 });
    else setCenter({ lat, lng });
  }, []);

  const gpsLocate = useGpsLocate({
    onFix: (fix) => {
      setHelp(null);
      setGps({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      goTo(fix.lat, fix.lng, zoomFor(fix.accuracy), "gps");
      if (fix.final) haptic("success");
    },
    onError: (h) => setHelp(h),
  });
  const { start: startLocate } = gpsLocate;

  // Android back / Telegram back closes the map, not the page; nothing behind it scrolls.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    window.history.pushState({ ...(window.history.state ?? {}), nzMap: true }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = overflow;
    };
  }, []);
  const close = useCallback(() => {
    if (window.history.state?.nzMap) window.history.back(); // popstate → onClose
    else onCloseRef.current();
  }, []);

  useEffect(() => {
    if (autoLocate) void startLocate();
  }, [autoLocate, startLocate]);

  // what is under the pin: street, house, district (debounced; only where the map came to rest)
  useEffect(() => {
    if (!placed || moving) return;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      setPlaceLoading(true);
      fetch(`/api/geo/locate?lat=${center.lat.toFixed(6)}&lng=${center.lng.toFixed(6)}&lang=${locale}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((b) => setPlace(b?.success ? b.data : null))
        .catch(() => undefined)
        .finally(() => !ctl.signal.aborted && setPlaceLoading(false));
    }, 450);
    return () => {
      ctl.abort();
      window.clearTimeout(timer);
    };
  }, [center, placed, moving, locale]);

  // search as you type (debounced); results closest to what's on screen first
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
      goTo(body.data.latitude, body.data.longitude, 18, "link");
      setLink("");
      setLinkOpen(false);
    } catch {
      setLinkError(true);
    } finally {
      setLinkBusy(false);
    }
  }

  function confirm() {
    haptic("success");
    onConfirm(center.lat, center.lng, { source, accuracy: source === "gps" ? gps?.accuracy ?? null : null, final: true });
    close();
  }

  const def = MAP_LAYERS[layer];
  const fab = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-ink shadow-lg backdrop-blur-sm transition-colors hover:text-primary active:scale-95";
  const weak = source === "gps" && gps?.accuracy != null && gps.accuracy > 50;
  const street = place ? [place.street, place.house].filter(Boolean).join(", ") : "";
  const title = street || place?.label?.split(",")[0] || t("pinnedPoint");
  const subtitle = place ? [place.district?.name, place.city?.name ?? place.region?.name].filter(Boolean).join(", ") : "";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("fullscreenTitle")} className="fixed inset-0 z-[3000] flex flex-col bg-surface" style={{ height: "100dvh" }}>
      {/* search + link */}
      <div className="relative z-[1100] space-y-2 border-b border-border bg-surface px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2" aria-label={t("back")}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <label className="nz-glass-input flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
            {searching ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-ink-soft" aria-hidden="true" /> : <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />}
            <input
              type="search" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 3) setResults(null); }}
              placeholder={t("searchShort")} aria-label={t("searchPlaceholder")} enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); if (e.key === "Escape") setResults(null); }}
            />
          </label>
          <button type="button" onClick={() => { setLinkOpen((v) => !v); setLinkError(false); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-ink hover:text-primary" aria-expanded={linkOpen} aria-label={t("pasteLink")}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {linkOpen && (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t("linkPlaceholder")} aria-label={t("linkPlaceholder")} autoFocus
                className="nz-glass-input h-11 min-w-0 flex-1 rounded-xl px-3 text-base" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLink(); } }}
              />
              <button type="button" onClick={handleLink} disabled={linkBusy || !link.trim()} className="rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
                {linkBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : t("linkApply")}
              </button>
            </div>
            <p className={`text-xs ${linkError ? "text-red-600 dark:text-red-400" : "text-ink-soft"}`}>{linkError ? t("linkError") : t("linkHint")}</p>
          </div>
        )}
        {results && query.trim().length >= 3 && (
          <div className="absolute left-3 right-3 top-full mt-1 max-h-[50dvh] overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
            {results.length === 0 && !searching && <p className="px-3 py-2 text-sm text-ink-soft">{t("noResults")}</p>}
            {results.map((r, i) => (
              <button key={`${r.lat},${r.lng},${i}`} type="button" className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
                onClick={() => { goTo(r.lat, r.lng, 17, "search"); setResults(null); setQuery(r.title); }}>
                <span className="block text-sm font-semibold text-ink">{r.title}</span>
                {r.subtitle && <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* the map, pin fixed in the centre */}
      <div className="relative min-h-0 flex-1">
        <MapContainer center={[center.lat, center.lng]} zoom={initial ? 18 : 12} zoomControl={false} scrollWheelZoom className="h-full w-full" style={{ height: "100%", width: "100%" }}>
          <TileLayer key={layer} url={def.url} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
          {def.labels && <TileLayer key={`${layer}-labels`} url={def.labels} maxZoom={19} />}
          <MapSizeFixer />
          <MapRef onReady={(m) => { mapRef.current = m; }} />
          <CenterTracker
            onMoveStart={() => setMoving(true)}
            onDrag={() => { setSource("map_pin"); setPlaced(true); setResults(null); }}
            onMoveEnd={(lat, lng) => { setMoving(false); setCenter({ lat, lng }); }}
          />
          {gps?.accuracy != null && <Circle center={[gps.lat, gps.lng]} radius={gps.accuracy} interactive={false} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.1, weight: 1 }} />}
          {gps && <CircleMarker center={[gps.lat, gps.lng]} radius={7} interactive={false} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} />}
        </MapContainer>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000]" style={{ transform: "translate(-50%, calc(-100% + 4px))" }}>
          <div className={`text-[var(--nz-primary)] transition-transform duration-150 ${moving ? "-translate-y-2.5" : ""}`}>{PIN_SVG}</div>
        </div>
        <div className={`pointer-events-none absolute left-1/2 top-1/2 z-[999] h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 transition-opacity ${moving ? "opacity-100" : "opacity-60"}`} />

        <p className="pointer-events-none absolute left-1/2 top-3 z-[1000] w-max max-w-[calc(100%-6.5rem)] -translate-x-1/2 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-center text-xs font-medium text-ink shadow-lg backdrop-blur-sm">
          {gpsLocate.locating ? (gpsLocate.accuracy != null ? t("improving", { meters: Math.round(gpsLocate.accuracy) }) : t("finding")) : t("moveMapHint")}
        </p>

        <div className="absolute right-3 top-3 z-[1000]">
          <button type="button" onClick={() => setLayersOpen((v) => !v)} className={fab} aria-expanded={layersOpen} aria-label={t("layers")}>
            <Layers className="h-5 w-5" aria-hidden="true" />
          </button>
          {layersOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-40 rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
              {MAP_LAYER_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => { setLayer(k); saveMapLayer(k); setLayersOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${k === layer ? "bg-primary-soft font-semibold text-primary" : "text-ink hover:bg-surface-2"}`}>
                  {t(`layer.${k}`)}
                  {k === layer && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-2">
          <button type="button" onClick={() => mapRef.current?.zoomIn()} className={fab} aria-label={t("zoomIn")}><Plus className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" onClick={() => mapRef.current?.zoomOut()} className={fab} aria-label={t("zoomOut")}><Minus className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" onClick={() => { setHelp(null); void startLocate(); }} className={`${fab} mt-1 !text-primary`} aria-label={t("myLocation")}>
            {gpsLocate.locating ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {help && (
          <div className="absolute inset-x-3 bottom-4 z-[1001] mr-14">
            <LocateHelpPanel help={help} onRetry={() => { setHelp(null); void startLocate(); }} onClose={() => setHelp(null)} />
          </div>
        )}
      </div>

      {/* what is under the pin + confirm */}
      <div className="relative z-[1100] space-y-3 rounded-t-3xl border-t border-border bg-surface px-4 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            {placeLoading || moving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            {placed ? (
              <>
                <p className="truncate text-base font-semibold text-ink">{moving ? t("detecting") : title}</p>
                <p className="truncate text-xs text-ink-soft">{moving ? " " : subtitle || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-ink">{t("choosePoint")}</p>
                <p className="text-xs text-ink-soft">{t("choosePointHint")}</p>
              </>
            )}
          </div>
        </div>
        {placed && !moving && place && !place.in_service_area && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"><TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{t("outsideArea")}</p>
        )}
        {placed && weak && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"><TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{t("weakFix", { meters: Math.round(gps!.accuracy!) })}</p>
        )}
        <button type="button" onClick={confirm} disabled={!placed || moving} className="nz-cta flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold disabled:opacity-50">
          <Check className="h-5 w-5" aria-hidden="true" />
          {t("confirm")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
