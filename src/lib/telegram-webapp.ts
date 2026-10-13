"use client";

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

export function haptic(kind: "success" | "error" | "light" | "select"): void {
  const h = telegramApp()?.HapticFeedback;
  if (!h) return;
  if (kind === "light") h.impactOccurred("light");
  else if (kind === "select") h.selectionChanged();
  else h.notificationOccurred(kind);
}
