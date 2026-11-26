"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCw, Wifi, WifiOff } from "lucide-react";
import { insideTelegram, isAndroid, isStandalone } from "@/lib/pwa";
import { androidMapIntent } from "@/lib/maps";

const THEME_LIGHT = "#f7faf8";
const THEME_DARK = "#060907";
const PULL_TRIGGER = 76; // px of (dampened) pull that refreshes
const PULL_MAX = 120;
// a pull that starts on these never refreshes the page (maps pan, sheets scroll, fields select text)
const NO_PULL = ".leaflet-container, [data-no-ptr], [role=dialog], input, textarea, select, [contenteditable=true], .nz-no-ptr";

/**
 * Everything the installed app (PWA) needs at runtime, mounted once in the root layout:
 *  - registers /sw.js (production; on a dev server only with localStorage nz-sw-dev=1),
 *  - keeps <meta name=theme-color> on the site's own light/dark choice (the status bar / task switcher colour),
 *  - an "offline / back online" pill,
 *  - pull-to-refresh in the installed app, where neither iPhone nor Android offers one,
 *  - Android: Yandex Maps / 2GIS links (store routes, address pins -- every page, server-rendered ones too) open the
 *    map app itself instead of its website in a browser tab (website fallback when the app is not installed).
 */
export default function PwaRuntime() {
  const t = useTranslations("pwa");
  const [net, setNet] = useState<"online" | "offline" | "back">("online");
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);

  // service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    let devOptIn = false;
    try {
      devOptIn = localStorage.getItem("nz-sw-dev") === "1";
    } catch {
      /* storage blocked */
    }
    if (process.env.NODE_ENV !== "production" && !devOptIn) return;
    if (insideTelegram()) return; // the Mini App is a Telegram webview, not an installable app
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // theme-color follows the site's theme switch (html.dark), not only the phone's setting
  useEffect(() => {
    const html = document.documentElement;
    const apply = () => {
      const color = html.classList.contains("dark") ? THEME_DARK : THEME_LIGHT;
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (metas.length) {
        metas.forEach((m) => {
          m.content = color;
          m.removeAttribute("media");
        });
      } else {
        const m = document.createElement("meta");
        m.name = "theme-color";
        m.content = color;
        document.head.appendChild(m);
      }
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Android: map links -> the map app
  useEffect(() => {
    if (!isAndroid() || insideTelegram()) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const intent = androidMapIntent(a.href);
      if (!intent) return;
      e.preventDefault();
      window.location.href = intent;
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // connectivity pill
  useEffect(() => {
    let timer: number | undefined;
    const off = () => {
      window.clearTimeout(timer);
      setNet("offline");
    };
    const on = () => {
      setNet((prev) => (prev === "offline" ? "back" : "online"));
      timer = window.setTimeout(() => setNet("online"), 2500);
    };
    if (!navigator.onLine) off();
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);

  // pull-to-refresh, installed app only
  useEffect(() => {
    if (!isStandalone()) return;
    let startY = 0;
    let startX = 0;
    let tracking = false;
    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      tracking = false;
      if (e.touches.length !== 1 || window.scrollY > 0) return;
      if (document.body.style.overflow === "hidden" || document.documentElement.style.overflow === "hidden") return; // a menu / sheet is open
      const target = e.target as Element | null;
      if (target?.closest(NO_PULL)) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (dy <= 0 || window.scrollY > 0 || dx > dy) {
        if (pullRef.current) set(0);
        if (dx > dy) tracking = false; // a sideways swipe (carousel, back gesture)
        return;
      }
      set(Math.min(PULL_MAX, dy * 0.5)); // rubber-band resistance
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (pullRef.current >= PULL_TRIGGER) {
        setRefreshing(true);
        set(PULL_TRIGGER);
        window.setTimeout(() => window.location.reload(), 220);
      } else set(0);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const ready = pull >= PULL_TRIGGER;
  return (
    <>
      {(pull > 0 || refreshing) && (
        <div className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center" style={{ top: `calc(env(safe-area-inset-top) + ${Math.max(0, pull - 44)}px)` }} aria-live="polite">
          <div className={`nz-glass-strong flex h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-ink shadow-lg transition-opacity ${pull > 18 || refreshing ? "opacity-100" : "opacity-0"}`}>
            <RotateCw
              className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={refreshing ? undefined : { transform: `rotate(${(pull / PULL_TRIGGER) * 270}deg)` }}
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span>{ready || refreshing ? t("releaseToRefresh") : t("pullToRefresh")}</span>
          </div>
        </div>
      )}
      {net !== "online" && (
        <div className="pointer-events-none fixed inset-x-0 z-[75] flex justify-center px-4" style={{ top: "calc(env(safe-area-inset-top) + 10px)" }} role="status">
          <div className={`flex max-w-md items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xl ring-1 animate-[nz-sheet-up_.3s_ease-out] ${net === "offline" ? "bg-zinc-900/95 text-white ring-white/10" : "bg-emerald-600 text-white ring-emerald-400/40"}`}>
            {net === "offline" ? <WifiOff className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" /> : <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>{net === "offline" ? t("offline") : t("backOnline")}</span>
          </div>
        </div>
      )}
    </>
  );
}
