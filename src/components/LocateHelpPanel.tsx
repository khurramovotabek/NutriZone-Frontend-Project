"use client";

import { useTranslations } from "next-intl";
import { Navigation, ShieldAlert, X } from "lucide-react";
import { openTelegramLocationSettings } from "@/lib/telegram-webapp";
import type { LocateHelp } from "@/lib/use-gps-locate";

/** How to fix "my location" not working (permission refused, GPS off, no signal, http, Telegram refused). */
export default function LocateHelpPanel({ help, onRetry, onClose }: { help: LocateHelp; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations("locationPicker");
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 p-3 text-xs text-ink dark:bg-amber-950/60">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <p className="font-semibold">{t(`${help}Title`)}</p>
        {help === "denied" ? (
          <ul className="list-disc space-y-0.5 pl-4 text-ink-muted">
            <li>{t("deniedChrome")}</li>
            <li>{t("deniedIphone")}</li>
            <li>{t("deniedTelegram")}</li>
          </ul>
        ) : (
          <p className="text-ink-muted">{t(`${help}Text`)}</p>
        )}
        <p className="text-ink-muted">{t("deniedAlternative")}</p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          {help !== "insecure" && help !== "unsupported" && (
            <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white">
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              {t("retry")}
            </button>
          )}
          {help === "tgDenied" && (
            <button type="button" onClick={() => openTelegramLocationSettings()} className="min-h-9 rounded-lg border border-border px-3 py-1.5 font-semibold text-ink">
              {t("tgOpenSettings")}
            </button>
          )}
        </div>
      </div>
      <button type="button" onClick={onClose} className="-m-1 self-start p-1 text-ink-soft hover:text-ink" aria-label={t("close")}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
