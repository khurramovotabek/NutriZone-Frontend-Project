"use client";

import { clientCookieAttrs, markEmbedded } from "./cookie-policy";

/** The parts of Telegram's Mini App API (telegram-web-app.js) the storefront uses. https://core.telegram.org/bots/webapps */
type BottomButton = {
  setText: (text: string) => BottomButton;
  show: () => BottomButton;
  hide: () => BottomButton;
  enable: () => BottomButton;
  showProgress: (leaveActive?: boolean) => BottomButton;
  hideProgress: () => BottomButton;
  setParams?: (p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean; has_shine_effect?: boolean }) => BottomButton;
  onClick: (cb: () => void) => BottomButton;
  offClick: (cb: () => void) => BottomButton;
  isVisible: boolean;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { start_param?: string; user?: { id: number; first_name?: string; last_name?: string; language_code?: string; photo_url?: string } };
  version: string;
  platform?: string;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast?: (v: string) => boolean;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  requestContact?: (cb?: (ok: boolean) => void) => void;
  openTelegramLink?: (url: string) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  MainButton?: BottomButton;
  /** Bot API 8.0+: the device location through Telegram's own permission (the in-app browser often has no GPS access). */
  LocationManager?: {
    isInited: boolean;
    isLocationAvailable: boolean;
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    init: (cb?: () => void) => void;
    getLocation: (cb: (data: { latitude: number; longitude: number; horizontal_accuracy?: number | null } | null) => void) => void;
    openSettings: () => void;
  };
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void; notificationOccurred: (t: "error" | "success" | "warning") => void; selectionChanged: () => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const TG_SCRIPT = "https://telegram.org/js/telegram-web-app.js";
const FLAG = "nz_tg";

/** The Mini App's WebApp object -- only when the page really runs inside Telegram (initData present). */
export function telegramApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const app = window.Telegram?.WebApp;
  return app && app.initData ? app : null;
}

export function supports(app: TelegramWebApp, version: string): boolean {
  return Boolean(app.isVersionAtLeast?.(version));
}

/** /tg remembers for this tab that the storefront is open inside Telegram (later pages have no initData in the URL). */
export function markMiniApp(): void {
  markEmbedded();
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    // storage blocked -- the bridge then simply stays off
  }
}

export function isMiniAppSession(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hash.includes("tgWebAppData")) return true;
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/** Loads telegram-web-app.js once; resolves with the WebApp (or null outside Telegram). */
export function loadTelegramScript(): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(telegramApp());
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TG_SCRIPT}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: TG_SCRIPT, async: true });
    script.addEventListener("load", () => resolve(telegramApp()), { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

/** First open inside Telegram: speak the shopper's Telegram language (uz / ru / en) unless they already chose one on the site. */
export function adoptTelegramLanguage(app: TelegramWebApp): boolean {
  if (document.cookie.split("; ").some((c) => c.startsWith("nz_locale="))) return false;
  const code = (app.initDataUnsafe?.user?.language_code || "").toLowerCase().slice(0, 2);
  const locale = code === "ru" || code === "en" || code === "uz" ? code : code === "kk" || code === "ky" || code === "tg" || code === "be" || code === "uk" ? "ru" : "uz";
  document.cookie = `nz_locale=${locale}; path=/; max-age=31536000${clientCookieAttrs()}`;
  return true;
}

/** Telegram's header, background and bottom bar take the page's own background colour, so the app has no seams. */
export function paintTelegramChrome(app: TelegramWebApp): void {
  const rgb = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
  if (!rgb || rgb.length < 3) return;
  const hex = "#" + rgb.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  app.setHeaderColor?.(hex);
  app.setBackgroundColor?.(hex);
  if (supports(app, "7.10")) app.setBottomBarColor?.(hex);
}

export function haptic(kind: "success" | "error" | "light" | "select"): void {
  const h = telegramApp()?.HapticFeedback;
  if (!h) return;
  if (kind === "light") h.impactOccurred("light");
  else if (kind === "select") h.selectionChanged();
  else h.notificationOccurred(kind);
}

export type TelegramFix = { lat: number; lng: number; accuracy: number | null };

/**
 * The location from Telegram itself when the page runs as the Mini App (Bot API 8.0+): Telegram asks the user once
 * and remembers. Resolves "unsupported" outside Telegram or on older clients (use the browser's geolocation then),
 * "denied" when the user refused (Telegram's settings can re-allow it), "unavailable" when the device has no fix.
 */
export function telegramLocation(): Promise<TelegramFix | "unsupported" | "denied" | "unavailable"> {
  const app = isMiniAppSession() ? telegramApp() : null;
  const lm = app && supports(app, "8.0") ? app.LocationManager : undefined;
  if (!lm) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    const ask = () => {
      if (!lm.isLocationAvailable) return resolve("unavailable");
      if (lm.isAccessRequested && !lm.isAccessGranted) return resolve("denied");
      lm.getLocation((d) => {
        if (!d) return resolve(lm.isAccessGranted ? "unavailable" : "denied");
        resolve({ lat: d.latitude, lng: d.longitude, accuracy: d.horizontal_accuracy ?? null });
      });
    };
    if (lm.isInited) ask();
    else lm.init(ask);
  });
}

/** Opens Telegram's location permission screen for this bot (after the user said no). */
export function openTelegramLocationSettings(): boolean {
  const lm = telegramApp()?.LocationManager;
  if (!lm) return false;
  lm.openSettings();
  return true;
}
