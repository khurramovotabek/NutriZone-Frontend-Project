"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Real, previously-dormant backend capability wired up: GET /stores
 * already accepts lat/lng (+ radius_km) and sorts by real haversine
 * distance (GeoDistanceCalculator) -- the frontend even already typed
 * `distance_meters` on StoreListItem and had a "nearMe" translation
 * key, but no UI ever actually requested the browser's location and
 * set these query params. This is that missing piece, not a new
 * backend feature. Toggling off removes lat/lng, keeping every other
 * active filter (city/district/open_now) intact.
 */
export default function NearMeFilter() {
  const t = useTranslations("stores");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const active = searchParams.has("lat") && searchParams.has("lng");

  function navigate(next: URLSearchParams) {
    const query = next.toString();
    router.push(`/stores${query ? `?${query}` : ""}`);
  }

  function toggle() {
    const next = new URLSearchParams(searchParams.toString());

    if (active) {
      next.delete("lat");
      next.delete("lng");
      navigate(next);
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState("error");
      return;
    }

    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        next.set("lat", String(position.coords.latitude));
        next.set("lng", String(position.coords.longitude));
        setState("idle");
        navigate(next);
      },
      () => setState("error"),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          active ? "border-primary/25 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40"
        }`}
      >
        {state === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" /> : <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />}
        {t("nearMe")}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {t("locationError")}
        </p>
      )}
    </div>
  );
}
