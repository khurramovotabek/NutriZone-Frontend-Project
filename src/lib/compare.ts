"use client";

import { useSyncExternalStore } from "react";
import { COMPARE_MAX } from "@/lib/compare-limits";

/**
 * The shopper's compare list (product slugs, at most MAX) -- a per-browser convenience kept in localStorage;
 * the compare page itself reads the list from its URL, so a comparison can be shared as a link.
 */
const KEY = "nz_compare";
const EVENT = "nz:compare";
export { COMPARE_MAX } from "@/lib/compare-limits";
const EMPTY: string[] = [];

let lastRaw: string | null = null;
let lastValue: string[] = EMPTY;

function snapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY; // storage blocked (private mode) -- the feature simply shows nothing
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const parsed = JSON.parse(raw ?? "[]");
      lastValue = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, COMPARE_MAX) : EMPTY;
    } catch {
      lastValue = EMPTY;
    }
  }
  return lastValue;
}

function write(slugs: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, COMPARE_MAX)));
  } catch {
    // storage blocked -- nothing to persist
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCompareList(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** Adds or removes a product; returns false when the list is already full and the product isn't in it. */
export function toggleCompare(slug: string): boolean {
  const current = snapshot();
  if (current.includes(slug)) {
    write(current.filter((s) => s !== slug));
    return true;
  }
  if (current.length >= COMPARE_MAX) return false;
  write([...current, slug]);
  return true;
}

export function setCompare(slugs: string[]) {
  write(slugs);
}

export function compareHref(slugs: string[]): string {
  return `/compare?items=${slugs.map(encodeURIComponent).join(",")}`;
}
