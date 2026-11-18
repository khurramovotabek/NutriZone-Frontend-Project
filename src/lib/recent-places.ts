"use client";

/**
 * The last places this browser confirmed on the map (checkout / address book), offered first when the customer opens
 * the map search again -- ordering to the same door twice should take one tap. Only in this browser (localStorage),
 * at most MAX, newest first; a point within ~40 m of an older one replaces it.
 */
export interface RecentPlace {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  at: number;
}

const KEY = "nz-recent-places";
const MAX = 5;

export function recentPlaces(): RecentPlace[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng) && typeof p?.title === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberPlace(place: Omit<RecentPlace, "at">): void {
  if (!place.title.trim()) return;
  try {
    const near = (p: RecentPlace) => Math.abs(p.lat - place.lat) < 0.0004 && Math.abs(p.lng - place.lng) < 0.0005;
    const next = [{ ...place, at: Date.now() }, ...recentPlaces().filter((p) => !near(p))].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked -- recents are a convenience */
  }
}

export function forgetPlaces(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
