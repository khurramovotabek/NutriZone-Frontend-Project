"use client";

import { ChevronRight, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { openInstallSheet } from "@/lib/pwa";

/**
 * "Install the app" entry -- opens the install sheet (InstallAppSheet). Hidden inside the installed app and the
 * Telegram Mini App by CSS (.nz-pwa-entry, see globals.css), so it renders the same on the server and the client.
 *  - menu: a highlighted row for the mobile drawer
 *  - footer: an app-store-style badge
 */
export default function InstallAppButton({ variant, onOpen, label }: { variant: "menu" | "footer" | "hero"; onOpen?: () => void; label?: string }) {
  const t = useTranslations("pwa");
  const open = () => {
    onOpen?.();
    // let a closing drawer release the page scroll first
    window.setTimeout(openInstallSheet, onOpen ? 120 : 0);
  };

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={open}
        className="nz-pwa-entry group inline-flex items-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-extrabold text-[#0b1220] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
      >
        <Download className="h-5 w-5 text-primary" strokeWidth={2.4} aria-hidden="true" />
        {label ?? t("installApp")}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={open}
        className="nz-pwa-entry group mb-3 flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-3 text-left transition-colors active:bg-primary-soft"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
        <img src="/pwa/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-white/10" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{t("installApp")}</span>
          <span className="block truncate text-xs text-ink-muted">{t("menuHint")}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="nz-pwa-entry mt-4 inline-flex items-center gap-2.5 rounded-xl border border-border bg-ink px-3.5 py-2 text-left text-surface shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <Download className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wider opacity-70">{t("menuHint")}</span>
        <span className="block text-sm font-bold">{t("installApp")}</span>
      </span>
    </button>
  );
}
