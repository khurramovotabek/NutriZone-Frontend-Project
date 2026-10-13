"use client";

/** Keeps the header bell and the notifications page in sync inside one tab (read one here -> the badge drops there). */
const EVENT = "nz:notifications-changed";

export function emitNotificationsChanged(unread?: number) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { unread } }));
}

export function onNotificationsChanged(cb: (unread: number | undefined) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<{ unread?: number }>).detail?.unread);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export async function markNotificationsRead(payload: { ids: string[] } | { all: true }): Promise<number | undefined> {
  const res = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => null);
  const unread = body?.data?.unread as number | undefined;
  emitNotificationsChanged(unread);
  return unread;
}

const JUST_NOW: Record<string, string> = { uz: "hozirgina", ru: "только что", en: "just now" };

/** Browsers ship little Uzbek relative-time data ("-47 s"), so Uzbek is phrased here; ru/en use Intl. */
function uzRelative(seconds: number): string {
  const m = Math.floor(seconds / 60), h = Math.floor(seconds / 3600), d = Math.floor(seconds / 86400);
  if (m < 60) return `${m} daqiqa oldin`;
  if (h < 24) return `${h} soat oldin`;
  if (d === 1) return "kecha";
  return `${d} kun oldin`;
}

/** "3 daqiqa oldin" / "3 минуты назад" / "3 minutes ago" in the site's locale. */
export function relativeTime(iso: string, locale: string): string {
  const seconds = Math.max((Date.now() - new Date(iso).getTime()) / 1000, 0);
  const lang = locale.slice(0, 2);
  if (seconds < 60) return JUST_NOW[lang] ?? JUST_NOW.en;
  if (seconds >= 86400 * 7) return new Date(iso).toLocaleDateString(lang === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "short", year: "numeric" });
  if (lang === "uz") return uzRelative(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  return rtf.format(-Math.floor(seconds / 86400), "day");
}
