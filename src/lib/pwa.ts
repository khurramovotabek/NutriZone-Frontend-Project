/**
 * Installable web app (PWA) helpers: "is the site running as the installed app", which phone / browser this is,
 * the browser's own install prompt, and a tiny event bus so any "Install the app" button opens the one install sheet.
 *
 * The install prompt (`beforeinstallprompt`, Chrome / Edge / Samsung Internet / Yandex on Android and desktop) can
 * fire before React hydrates, so PWA_BOOT_SCRIPT -- inlined at the top of <body> -- stashes it on `window.__nzBip`
 * and marks <html data-standalone> before the first paint (no flash of the back button / install entries).
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __nzBip?: BeforeInstallPromptEvent | null;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

export const INSTALL_OPEN_EVENT = "nz:install-open";
export const INSTALL_READY_EVENT = "nz:install-ready";
export const INSTALLED_KEY = "nz_pwa_installed";

/** Runs before hydration (inlined in the root layout): standalone flag + early install-prompt capture. */
export const PWA_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,n=navigator,s=(window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches))||n.standalone===true;if(s){d.setAttribute('data-standalone',/iP(hone|ad|od)/.test(n.userAgent)||(n.platform==='MacIntel'&&n.maxTouchPoints>1)?'ios':'1');try{localStorage.setItem('${INSTALLED_KEY}','1')}catch(e){}}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__nzBip=e;window.dispatchEvent(new Event('${INSTALL_READY_EVENT}'))});window.addEventListener('appinstalled',function(){window.__nzBip=null;try{localStorage.setItem('${INSTALLED_KEY}','1')}catch(e){}})}catch(e){}})();`;

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.hasAttribute("data-standalone") || window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

export type InstallPlatform = "ios-safari" | "ios-other" | "android" | "desktop-chromium" | "desktop-edge" | "desktop-safari" | "desktop-firefox" | "desktop-other" | "in-app";

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|Telegram|WebView|; wv\)/i;

export function isIOS(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  if (/iP(hone|ad|od)/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac
  return typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroid(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /Android/i.test(ua);
}

export function insideTelegram(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData) || document.documentElement.getAttribute("data-tg") === "1";
}

/** Which install path this browser offers (decides the sheet: one-tap button, iPhone steps, or "open in a browser"). */
export function installPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop-other";
  const ua = navigator.userAgent;
  if (insideTelegram() || IN_APP.test(ua)) return "in-app";
  if (isIOS(ua)) return /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\//.test(ua) ? "ios-other" : "ios-safari";
  if (isAndroid(ua)) return "android";
  if (/Edg\//.test(ua)) return "desktop-edge";
  if (/Firefox\//.test(ua)) return "desktop-firefox";
  if (/Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) return "desktop-safari";
  if (/Chrome|Chromium/.test(ua)) return "desktop-chromium";
  return "desktop-other";
}

export function deferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return typeof window === "undefined" ? null : window.__nzBip ?? null;
}

/** Shows the browser's own install dialog. Resolves true when the shopper accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferredInstallPrompt();
  if (!e) return false;
  try {
    await e.prompt();
    const choice = await e.userChoice;
    window.__nzBip = null; // a prompt event is single-use
    return choice.outcome === "accepted";
  } catch {
    return false;
  }
}

export function openInstallSheet(): void {
  window.dispatchEvent(new Event(INSTALL_OPEN_EVENT));
}

export function wasInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}
