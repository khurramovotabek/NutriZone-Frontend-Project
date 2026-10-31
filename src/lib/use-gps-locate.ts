"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { telegramLocation } from "@/lib/telegram-webapp";

/** Why "my location" did not produce a point -- the picker shows matching how-to-fix help. */
export type LocateHelp = "denied" | "insecure" | "off" | "timeout" | "tgDenied" | "unsupported";

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** false while still refining (a better fix may follow); true for the point to keep. */
  final: boolean;
}

const GOOD_ACCURACY_M = 20; // stop listening once a fix is this precise
const LISTEN_MS = 9000; // ...or after this long, keeping the best fix

/**
 * "Use my location" for the map pickers. Inside the Telegram Mini App it asks Telegram (Bot API 8.0+ LocationManager --
 * the in-app browser often has no GPS access); otherwise the browser: watchPosition, not getCurrentPosition, because
 * phones answer first from Wi-Fi / cell towers and then GPS -- it keeps listening a few seconds and reports every
 * better fix, then the best one as `final`.
 */
export function useGpsLocate({ onFix, onError }: { onFix: (fix: GpsFix) => void; onError: (help: LocateHelp) => void }) {
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const bestRef = useRef<GeolocationPosition | null>(null);
  const cbRef = useRef({ onFix, onError });
  useEffect(() => {
    cbRef.current = { onFix, onError };
  });

  const stop = useCallback((commit = false) => {
    if (watchRef.current != null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchRef.current);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    watchRef.current = null;
    timerRef.current = null;
    setLocating(false);
    const best = bestRef.current;
    bestRef.current = null;
    if (commit && best) cbRef.current.onFix({ lat: best.coords.latitude, lng: best.coords.longitude, accuracy: best.coords.accuracy, final: true });
  }, []);

  useEffect(() => () => {
    // unmount: stop the GPS watch without reporting anything
    if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const start = useCallback(async () => {
    if (watchRef.current != null) {
      stop(true);
      return;
    }
    setAccuracy(null);
    const tg = await telegramLocation();
    if (tg !== "unsupported") {
      if (typeof tg === "object") {
        setAccuracy(tg.accuracy);
        cbRef.current.onFix({ lat: tg.lat, lng: tg.lng, accuracy: tg.accuracy, final: true });
      } else cbRef.current.onError(tg === "denied" ? "tgDenied" : "off");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return cbRef.current.onError("unsupported");
    if (!window.isSecureContext) return cbRef.current.onError("insecure");
    try {
      const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (status?.state === "denied") return cbRef.current.onError("denied");
    } catch {
      /* Permissions API missing (older Safari) -- just ask */
    }
    setLocating(true);
    bestRef.current = null;
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const best = bestRef.current;
        if (best && position.coords.accuracy >= best.coords.accuracy) return; // keep the most precise fix
        bestRef.current = position;
        setAccuracy(position.coords.accuracy);
        if (position.coords.accuracy <= GOOD_ACCURACY_M) {
          stop(true);
          return;
        }
        cbRef.current.onFix({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, final: false });
      },
      (error) => {
        if (bestRef.current) {
          stop(true); // a later failure after a fix: keep the best one we have
          return;
        }
        stop();
        cbRef.current.onError(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "off");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    timerRef.current = window.setTimeout(() => {
      if (bestRef.current) stop(true);
    }, LISTEN_MS);
  }, [stop]);

  return { locating, accuracy, start, stop };
}
