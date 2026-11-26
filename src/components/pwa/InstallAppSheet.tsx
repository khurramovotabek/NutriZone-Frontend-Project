"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, Check, Copy, Download, EllipsisVertical, MapPin, ShieldCheck, Smartphone, SquarePlus, X, Zap } from "lucide-react";
import { useBrand } from "@/components/BrandContext";
import DesktopInstallDialog from "@/components/pwa/DesktopInstallDialog";
import { useIsClient } from "@/hooks/useIsClient";
import {
  INSTALL_OPEN_EVENT,
  INSTALL_READY_EVENT,
  deferredInstallPrompt,
  installPlatform,
  isStandalone,
  promptInstall,
  wasInstalled,
  type InstallPlatform,
} from "@/lib/pwa";

const DISMISS_KEY = "nz_pwa_nudge_dismissed_at";
const VIEWS_KEY = "nz_pwa_nudge_views";
const DISMISS_DAYS = 14;
const VIEWS_BEFORE_NUDGE = 3;
const SECONDS_BEFORE_NUDGE = 60;
// paying / signing-in paths: never interrupt them
const QUIET_PATHS = ["/checkout", "/cart", "/login", "/verify-otp", "/auto-login", "/profile", "/orders/", "/account/chat"];

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The iOS "Share" glyph (square with an arrow up) -- the exact button the shopper has to find. */
function IosShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

type Mode = "closed" | "card" | "sheet";
type Stage = "intro" | "installing" | "done";

/**
 * "Install the app" -- the site installs onto the phone's home screen straight from the browser (PWA), no store.
 *
 * Two forms:
 *  - card: a small automatic nudge for phone visitors who keep browsing (3rd product page or a minute in), never on
 *    checkout / cart / sign-in, never inside Telegram or an in-app browser, never once installed; "Later" hides it for
 *    14 days. Android: its button opens the browser's own install dialog directly. iPhone: it opens the sheet.
 *  - sheet: opened from the menu / footer ("Install the app") or the card -- one-tap install where the browser
 *    allows it (Chrome, Edge, Samsung, Yandex), otherwise the exact steps for this phone and browser (Safari's Share
 *    -> Add to Home Screen, Chrome on iPhone, Android menu, desktop), or "open the site in a browser first" for
 *    Telegram / Instagram in-app windows, which cannot install anything.
 */
export default function InstallAppSheet() {
  const t = useTranslations("pwa");
  const brand = useBrand();
  const pathname = usePathname() || "/";
  const mounted = useIsClient();
  const [mode, setMode] = useState<Mode>("closed");
  const [stage, setStage] = useState<Stage>("intro");
  const [canPrompt, setCanPrompt] = useState(() => Boolean(deferredInstallPrompt()));
  const [copied, setCopied] = useState(false);
  // browser facts -- only read once mounted (the sheet renders nothing before that)
  const platform: InstallPlatform = mounted ? installPlatform() : "desktop-other";
  const standalone = mounted && isStandalone();
  const sheetRef = useRef<HTMLDivElement>(null);
  const qrPendingRef = useRef(false);
  const appName = brand.shortName && brand.shortName.toLowerCase() !== "nutrizone" ? brand.shortName : "NutriZone";

  useEffect(() => {
    const ready = () => setCanPrompt(Boolean(deferredInstallPrompt()));
    const installed = () => {
      setCanPrompt(false);
      setStage("done");
    };
    const open = () => {
      setCanPrompt(Boolean(deferredInstallPrompt()));
      setStage("intro");
      setMode("sheet");
    };
    window.addEventListener(INSTALL_READY_EVENT, ready);
    window.addEventListener("appinstalled", installed);
    window.addEventListener(INSTALL_OPEN_EVENT, open);
    // arrived from the desktop dialog's QR code: open the sheet straight away and tidy the address
    // (a ref, so React's dev double-run of this effect -- which already tidied the URL -- still opens it)
    let fromQr: number | undefined;
    const params = new URLSearchParams(window.location.search);
    if (params.get("install") === "1") {
      params.delete("install");
      params.delete("source");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
      qrPendingRef.current = !isStandalone();
    }
    if (qrPendingRef.current) {
      fromQr = window.setTimeout(() => {
        qrPendingRef.current = false;
        open();
      }, 600);
    }
    return () => {
      window.clearTimeout(fromQr);
      window.removeEventListener(INSTALL_READY_EVENT, ready);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener(INSTALL_OPEN_EVENT, open);
    };
  }, []);

  // automatic nudge (phones; computers only with a one-click install)
  useEffect(() => {
    if (isStandalone() || wasInstalled()) return;
    const local = store("local");
    const dismissedAt = Number(local?.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;
    const p = installPlatform();
    if (p === "in-app") return;
    if (QUIET_PATHS.some((q) => pathname.startsWith(q))) return;
    const session = store("session");
    const views = Number(session?.getItem(VIEWS_KEY) || 0) + (pathname.startsWith("/products/") ? 1 : 0);
    session?.setItem(VIEWS_KEY, String(views));
    let cancelled = false;
    const show = async () => {
      if (cancelled) return;
      // Android without the browser's prompt (Firefox, some WebViews): the steps are still in the menu entry, no nudge
      if (p === "android" && !deferredInstallPrompt()) return;
      // computers: only where the browser installs in one click (Chrome / Edge / Yandex) -- no how-to nudges
      if (p.startsWith("desktop") && !deferredInstallPrompt()) return;
      // already installed on this phone (Chrome knows via related_applications)
      try {
        const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
        if (nav.getInstalledRelatedApps && (await nav.getInstalledRelatedApps()).length) return;
      } catch {
        /* not supported */
      }
      // never stack on another bottom card (sign-up nudge, "added to cart" bar, an open dialog)
      if (document.querySelector('[aria-labelledby="signup-nudge-title"], [role="dialog"]') || document.body.style.overflow === "hidden") {
        timer = window.setTimeout(show, 15000);
        return;
      }
      if (!cancelled) setMode((m) => (m === "closed" ? "card" : m));
    };
    let timer = window.setTimeout(show, views >= VIEWS_BEFORE_NUDGE ? 2500 : SECONDS_BEFORE_NUDGE * 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  // sheet: Escape closes, the page behind does not scroll
  useEffect(() => {
    if (mode !== "sheet") return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMode("closed");
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const dismiss = useCallback(() => {
    store("local")?.setItem(DISMISS_KEY, String(Date.now()));
    setMode("closed");
  }, []);

  const install = useCallback(async () => {
    if (!deferredInstallPrompt()) {
      setMode("sheet");
      return;
    }
    setStage("installing");
    const accepted = await promptInstall();
    setCanPrompt(false);
    if (accepted) {
      setStage("done");
      setMode("sheet");
    } else {
      setStage("intro");
      if (mode === "card") dismiss();
    }
  }, [dismiss, mode]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (!mounted || mode === "closed") return null;
  if (mode === "card" && QUIET_PATHS.some((q) => pathname.startsWith(q))) return null;

  const icon = (size: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- a static app icon from /public
    <img src="/pwa/icon-192.png" alt="" width={192} height={192} className={`${size} shrink-0 rounded-[22%] shadow-[0_10px_24px_-8px_rgba(29,78,216,0.55)] ring-1 ring-white/10`} />
  );

  if (mode === "card") {
    const direct = canPrompt && !platform.startsWith("ios"); // iPhone has no install dialog -- always the steps
    const desktop = platform.startsWith("desktop");
    return createPortal(
      <div
        role="dialog"
        aria-labelledby="pwa-card-title"
        className={`nz-pwa-card fixed z-[55] animate-[nz-sheet-up_.35s_ease-out] rounded-3xl border border-ink/10 bg-surface/95 p-3.5 shadow-2xl shadow-black/30 backdrop-blur-xl ${desktop ? "bottom-6 left-6 w-[360px]" : "inset-x-3 mx-auto max-w-md"}`}
        style={desktop ? undefined : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
      >
        <div className="flex items-center gap-3">
          {icon("h-12 w-12")}
          <div className="min-w-0 flex-1">
            <p id="pwa-card-title" className="truncate text-[15px] font-extrabold tracking-tight text-ink">
              {desktop ? t("installDesktop") : t("installApp")}
            </p>
            <p className="truncate text-xs text-ink-muted">{desktop ? t("perkWindow") : t("menuHint")}</p>
          </div>
          <button type="button" onClick={dismiss} aria-label={t("close")} className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={dismiss} className="flex-1 rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
            {t("later")}
          </button>
          <button
            type="button"
            onClick={direct ? install : () => setMode("sheet")}
            disabled={stage === "installing"}
            className="nz-cta flex flex-[1.4] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold disabled:opacity-70"
          >
            <Download className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            {stage === "installing" ? t("installing") : t("installShort")}
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  if (platform.startsWith("desktop")) {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" role="presentation">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px] animate-[nz-fade-in_.2s_ease-out]" aria-hidden="true" onClick={() => setMode("closed")} />
        <div
          ref={sheetRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-sheet-title"
          className="nz-glass-strong relative max-h-[calc(100vh-3rem)] w-full max-w-4xl animate-[nz-sheet-up_.35s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto rounded-[30px] outline-none"
        >
          <DesktopInstallDialog
            platform={platform}
            appName={appName}
            canPrompt={canPrompt}
            stage={stage}
            standalone={standalone}
            onInstall={install}
            onClose={() => setMode("closed")}
            onLater={dismiss}
          />
        </div>
      </div>,
      document.body,
    );
  }

  const perks = [
    { icon: <Zap className="h-4 w-4 text-amber-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkFast") },
    { icon: <Smartphone className="h-4 w-4 text-sky-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkFull") },
    { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkStore") },
    { icon: <MapPin className="h-4 w-4 text-rose-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkMaps") },
  ];

  const step = (n: number, text: React.ReactNode, hint?: string, glyph?: React.ReactNode) => (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-extrabold text-white shadow-[0_6px_14px_-6px_rgba(var(--nz-primary-rgb),0.8)]">{n}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-snug text-ink">{text}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      </span>
      {glyph && <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 px-2 text-primary">{glyph}</span>}
    </li>
  );

  const iPhone = platform.startsWith("ios") && typeof navigator !== "undefined" && /iPhone|iPod/.test(navigator.userAgent);
  let body: React.ReactNode;
  if (stage === "done" || standalone) {
    body = (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/5">
          <Check className="h-7 w-7" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <p className="mt-4 text-base font-extrabold text-ink">{standalone && stage !== "done" ? t("alreadyInstalled") : t("installed")}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("installedHint", { brand: appName })}</p>
        <button type="button" onClick={() => setMode("closed")} className="nz-cta mt-5 w-full rounded-2xl px-5 py-3.5 text-sm font-bold">
          OK
        </button>
      </div>
    );
  } else if (platform === "in-app") {
    body = (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-bold text-ink">{t("inAppTitle")}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{t("inAppText")}</p>
        <button type="button" onClick={copyLink} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink">
          {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t("copied") : t("copyLink")}
        </button>
      </div>
    );
  } else if (platform === "ios-safari" || platform === "ios-other") {
    body = (
      <div>
        <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-soft">{t("iosTitle")}</p>
        <ol className="divide-y divide-border rounded-2xl border border-border bg-surface-2/50 px-3.5">
          {step(1, platform === "ios-safari" ? t("iosStep1") : t("iosStep1Chrome"), t("iosStep1Hint"), <IosShareIcon className="h-5 w-5" />)}
          {step(2, t("iosStep2"), t("iosStep2Hint"), <SquarePlus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />)}
          {step(3, t("iosStep3"), undefined, <span className="text-[11px] font-extrabold">{t("iosAdd")}</span>)}
        </ol>
        <p className="mt-2.5 text-xs text-ink-soft">{t("iosOld")}</p>
      </div>
    );
  } else if (canPrompt) {
    body = (
      <button type="button" onClick={install} disabled={stage === "installing"} className="nz-cta flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 text-[15px] font-extrabold disabled:opacity-70">
        <Download className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
        {stage === "installing" ? t("installing") : t("install")}
      </button>
    );
  } else if (platform === "android") {
    body = (
      <div>
        <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-soft">{t("androidTitle")}</p>
        <ol className="divide-y divide-border rounded-2xl border border-border bg-surface-2/50 px-3.5">
          {step(1, t("androidStep1"), undefined, <EllipsisVertical className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />)}
          {step(2, t("androidStep2"), undefined, <Download className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />)}
          {step(3, t("androidStep3"))}
        </ol>
      </div>
    );
  } else {
    body = null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px] animate-[nz-fade-in_.2s_ease-out]" aria-hidden="true" onClick={() => setMode("closed")} />
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-sheet-title"
        className="nz-glass-strong relative w-full max-w-md animate-[nz-sheet-up_.35s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-t-[30px] px-5 pt-2.5 outline-none sm:rounded-[30px] sm:pb-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3.5">
          {icon("h-16 w-16")}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black tracking-tight text-ink">{appName}</p>
            <p className="truncate text-xs font-medium text-ink-soft">{t("appMeta")}</p>
          </div>
          <button type="button" onClick={() => setMode("closed")} aria-label={t("close")} className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-ink/5 text-ink-muted transition-colors hover:text-ink">
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>

        {stage !== "done" && !standalone && (
          <>
            <h2 id="pwa-sheet-title" className="relative mt-4 text-[19px] font-extrabold leading-tight tracking-tight text-ink">
              {t("title", { brand: appName })}
            </h2>
            <p className="relative mt-1.5 text-[13px] leading-relaxed text-ink-muted">{t("subtitle")}</p>
            <ul className="relative mt-4 grid grid-cols-2 gap-2">
              {perks.map(({ icon: glyph, text }) => (
                <li key={text} className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-2.5 py-2 text-[12px] font-semibold leading-tight text-ink">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2">{glyph}</span>
                  {text}
                </li>
              ))}
            </ul>
          </>
        )}
        {(stage === "done" || standalone) && <h2 id="pwa-sheet-title" className="sr-only">{t("installApp")}</h2>}

        <div className="relative mt-4">{body}</div>

        {stage !== "done" && !standalone && (
          <button type="button" onClick={dismiss} className="relative mt-2 w-full py-2 text-center text-xs font-semibold text-ink-soft hover:text-ink">
            {t("later")}
          </button>
        )}
        {iPhone && platform === "ios-safari" && stage !== "done" && !standalone && (
          <div className="relative flex justify-center pt-1 text-primary" aria-hidden="true">
            <ArrowDown className="h-6 w-6 animate-bounce" strokeWidth={2.6} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

