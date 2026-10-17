"use client";

import { telegramLocation } from "@/lib/telegram-webapp";

export type ApproxPosition = { lat: number; lng: number } | { error: "denied" | "off" | "timeout" | "unsupported" };

/**
 * "Roughly where am I" for sorting branches by distance (near-me filter, pickup at checkout): Telegram's own location
 * inside the Mini App, otherwise the browser's -- a recent cached fix is fine, so it answers fast. The precise map
 * point for an address or a branch is LocationPicker's job.
 */
export async function approxPosition(): Promise<ApproxPosition> {
  const tg = await telegramLocation();
  if (typeof tg === "object") return { lat: tg.lat, lng: tg.lng };
  if (tg === "denied") return { error: "denied" };
  if (tg === "unavailable") return { error: "off" };
  if (typeof navigator === "undefined" || !navigator.geolocation || !window.isSecureContext) return { error: "unsupported" };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => resolve({ error: e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "off" }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
