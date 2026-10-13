"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Crosshair, Map as MapIcon, Navigation, Send, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { appleMapsUrl, coordinatesText, googleMapsUrl, shareText, telegramShareUrl, twoGisUrl, yandexPointUrl, yandexRouteUrl } from "@/lib/maps";

/** The Yandex Maps "Я" mark, drawn inline (no external asset). */
function YandexMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
      <path fill="#fff" d="M13.32 6.2h-1.1c-2.02 0-3.08 1.02-3.08 2.53 0 1.71.73 2.51 2.24 3.53l1.24.84-3.58 5.35H6.37l3.22-4.78C7.74 12.35 6.7 11.07 6.7 8.9c0-2.72 1.9-4.58 5.5-4.58h3.57v13.35h-2.45V6.2Z" />
    </svg>
  );
}

/** An apple silhouette for Apple Maps. */
function AppleMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.59 1.1 8.75.73 1.05 1.6 2.23 2.73 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.49 2.56-1.23Z" />
    </svg>
  );
}

/** The 2GIS green mark. */
function TwoGisMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#19AA1E" />
      <text x="12" y="16.2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">2</text>
    </svg>
  );
}

/**
 * Every place that shows a map gets the same actions: open the point in Yandex Maps, build a Yandex route, open it
 * in Google Maps, Apple Maps (the Maps app on an iPhone) or 2GIS -- and a share menu: the phone's share sheet,
 * Telegram, copy the link, copy the coordinates.
 */
export default function MapLinks({ latitude, longitude, label, className = "", compact = false }: { latitude: number; longitude: number; label?: string; className?: string; compact?: boolean }) {
  const t = useTranslations("maps");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "coords" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // the menu only renders after a click (client side), so reading navigator here never differs from the server HTML
  const canNativeShare = open && typeof navigator !== "undefined" && typeof navigator.share === "function";
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const name = label || t("onMap");

  async function copy(kind: "link" | "coords") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? shareText(latitude, longitude, label) : coordinatesText(latitude, longitude));
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: name, text: shareText(latitude, longitude, label), url: yandexPointUrl(latitude, longitude) });
      setOpen(false);
    } catch {
      /* cancelled */
    }
  }

  // solid (not glass): these also sit on top of map tiles, where glass turns unreadable
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/95 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:text-primary";
  const pad = compact ? "h-9 w-9 justify-center" : "px-3 py-2";
  const apps = [
    { href: yandexPointUrl(latitude, longitude), label: t("yandex"), title: t("openYandex"), icon: <YandexMark /> },
    { href: yandexRouteUrl(latitude, longitude), label: t("route"), title: t("route"), icon: <Navigation className="h-4 w-4 text-[#FC3F1D]" strokeWidth={2.25} aria-hidden="true" /> },
    { href: googleMapsUrl(latitude, longitude), label: "Google", title: t("openGoogle"), icon: <MapIcon className="h-4 w-4 text-sky-500" strokeWidth={2.25} aria-hidden="true" /> },
    { href: appleMapsUrl(latitude, longitude, label), label: "Apple", title: t("openApple"), icon: <AppleMark className="h-4 w-4 text-ink" /> },
    { href: twoGisUrl(latitude, longitude), label: "2GIS", title: t("open2gis"), icon: <TwoGisMark /> },
  ];
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {apps.map((a) => (
        <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className={`${btn} ${pad}`} title={a.title} aria-label={a.title}>
          {a.icon}
          {!compact && a.label}
        </a>
      ))}
      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setOpen((v) => !v)} className={`${btn} ${pad}`} title={t("share")} aria-label={t("share")} aria-haspopup="menu" aria-expanded={open}>
          <Share2 className="h-4 w-4 text-violet-500" strokeWidth={2.25} aria-hidden="true" />
          {!compact && t("share")}
        </button>
        {open && (
          <div role="menu" className="absolute bottom-full right-0 z-[1100] mb-2 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
            {canNativeShare && (
              <button type="button" role="menuitem" onClick={nativeShare} className={item}>
                <Share2 className="h-4 w-4 text-violet-500" strokeWidth={2} aria-hidden="true" />
                {t("shareSheet")}
              </button>
            )}
            <a role="menuitem" href={telegramShareUrl(latitude, longitude, name)} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
              <Send className="h-4 w-4 text-sky-500" strokeWidth={2} aria-hidden="true" />
              {t("shareTelegram")}
            </a>
            <button type="button" role="menuitem" onClick={() => copy("link")} className={item}>
              {copied === "link" ? <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} aria-hidden="true" /> : <Copy className="h-4 w-4 text-ink-soft" strokeWidth={2} aria-hidden="true" />}
              {copied === "link" ? t("copied") : t("copyLinks")}
            </button>
            <button type="button" role="menuitem" onClick={() => copy("coords")} className={item}>
              {copied === "coords" ? <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} aria-hidden="true" /> : <Crosshair className="h-4 w-4 text-ink-soft" strokeWidth={2} aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block">{copied === "coords" ? t("copied") : t("copyCoordinates")}</span>
                <span className="block font-mono text-[11px] text-ink-soft">{coordinatesText(latitude, longitude)}</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
