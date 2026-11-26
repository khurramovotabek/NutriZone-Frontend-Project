"use client";

import { useEffect, useState } from "react";
import { MonitorDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { INSTALL_READY_EVENT, deferredInstallPrompt, isStandalone, openInstallSheet } from "@/lib/pwa";

/**
 * Desktop header: an "Install on this computer" icon that appears only when the browser can install the site in one
 * click (Chrome / Edge / Yandex fired `beforeinstallprompt`) -- so it never shows on Firefox, Safari, inside the
 * installed app, or once installed. Opens the desktop install dialog.
 */
export default function DesktopInstallButton() {
  const t = useTranslations("pwa");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setReady(Boolean(deferredInstallPrompt()) && !isStandalone());
    const gone = () => setReady(false);
    const timer = window.setTimeout(sync, 0); // the prompt may have been captured before hydration
    window.addEventListener(INSTALL_READY_EVENT, sync);
    window.addEventListener("appinstalled", gone);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INSTALL_READY_EVENT, sync);
      window.removeEventListener("appinstalled", gone);
    };
  }, []);

  if (!ready) return null;
  return (
    <button
      type="button"
      onClick={openInstallSheet}
      title={t("headerInstall")}
      aria-label={t("headerInstall")}
      className="nz-pwa-entry group relative flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 text-xs font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
    >
      <MonitorDown className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      <span className="hidden 2xl:inline">{t("installShort")}</span>
    </button>
  );
}
