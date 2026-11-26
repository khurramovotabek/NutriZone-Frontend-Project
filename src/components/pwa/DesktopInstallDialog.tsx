"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppWindow, Check, Copy, Download, Monitor, Pin, RefreshCw, Smartphone, X, Zap } from "lucide-react";
import type { InstallPlatform } from "@/lib/pwa";

type Stage = "intro" | "installing" | "done";

/**
 * Desktop "Install the app" dialog (Chrome / Edge / Yandex / Safari on macOS / Firefox). Two columns:
 *  - left: what the installed app gives on a computer, then either the one-click install (the browser's own
 *    confirmation follows) or the exact steps for this browser; Firefox is told plainly it can't install apps.
 *  - right: a preview of the app in its own window above a taskbar/Dock, and a QR code that opens the site on the
 *    shopper's phone with the install sheet already up (?install=1).
 */
export default function DesktopInstallDialog({
  platform,
  appName,
  canPrompt,
  stage,
  standalone,
  onInstall,
  onClose,
  onLater,
}: {
  platform: InstallPlatform;
  appName: string;
  canPrompt: boolean;
  stage: Stage;
  standalone: boolean;
  onInstall: () => void;
  onClose: () => void;
  onLater: () => void;
}) {
  const t = useTranslations("pwa");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const url = `${window.location.origin}/?install=1&source=desktop-qr`;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark: "#0b1220", light: "#ffffff" } }))
      .then((src) => alive && setQr(src))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const done = stage === "done" || standalone;
  const perks = [
    { icon: <AppWindow className="h-4 w-4 text-sky-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkWindow") },
    { icon: <Pin className="h-4 w-4 text-violet-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkDock") },
    { icon: <Zap className="h-4 w-4 text-amber-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkLight") },
    { icon: <RefreshCw className="h-4 w-4 text-emerald-400" strokeWidth={2.2} aria-hidden="true" />, text: t("perkUpdates") },
  ];

  const step = (n: number, text: string) => (
    <li key={n} className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-extrabold text-white">{n}</span>
      <span className="text-[13.5px] font-semibold leading-snug text-ink">{text}</span>
    </li>
  );

  let action: React.ReactNode;
  if (done) {
    action = (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-ink">{standalone && stage !== "done" ? t("alreadyInstalled") : t("installed")}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{t("desktopInstalledHint", { brand: appName })}</p>
        </div>
      </div>
    );
  } else if (canPrompt) {
    action = (
      <div>
        <button type="button" onClick={onInstall} disabled={stage === "installing"} className="nz-cta flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-[15px] font-extrabold disabled:opacity-70">
          <Download className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          {stage === "installing" ? t("installing") : t("installDesktop")}
        </button>
        <p className="mt-2 text-center text-xs text-ink-soft">{t("installDesktopNote")}</p>
      </div>
    );
  } else if (platform === "desktop-firefox") {
    action = (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-[13.5px] font-semibold leading-relaxed text-ink">{t("desktopStepFirefox")}</p>
        <button type="button" onClick={copyLink} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink">
          {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t("copied") : t("copyLink")}
        </button>
      </div>
    );
  } else {
    const steps =
      platform === "desktop-safari"
        ? [t("desktopStepSafari"), t("desktopConfirm")]
        : platform === "desktop-edge"
          ? [t("desktopStepEdge"), t("desktopConfirm")]
          : [t("desktopStepChrome"), t("desktopStepChromeMenu"), t("desktopConfirm")];
    action = (
      <div>
        <ol className="divide-y divide-border rounded-2xl border border-border bg-surface-2/50 px-4">{steps.map((s, i) => step(i + 1, s))}</ol>
        {platform === "desktop-chromium" && <p className="mt-2 text-xs text-ink-soft">{t("desktopChromeInstalled")}</p>}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1.05fr_1fr]">
      {/* left: pitch + action */}
      <div className="relative p-7 pb-6">
        <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink-muted transition-colors hover:text-ink md:hidden">
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </button>
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
          <img src="/pwa/icon-192.png" alt="" width={192} height={192} className="h-14 w-14 rounded-[22%] shadow-[0_10px_24px_-8px_rgba(29,78,216,0.55)] ring-1 ring-white/10" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-lg font-black tracking-tight text-ink">
              {appName}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-primary">
                <Monitor className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                {t("desktopBadge")}
              </span>
            </p>
            <p className="truncate text-xs font-medium text-ink-soft">{t("appMeta")}</p>
          </div>
        </div>
        <h2 id="pwa-sheet-title" className="relative mt-5 text-2xl font-extrabold leading-tight tracking-tight text-ink">
          {t("titleDesktop", { brand: appName })}
        </h2>
        <p className="relative mt-2 text-sm leading-relaxed text-ink-muted">{t("desktopSubtitle")}</p>
        <ul className="relative mt-5 grid grid-cols-2 gap-2">
          {perks.map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-[12.5px] font-semibold leading-tight text-ink">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">{icon}</span>
              {text}
            </li>
          ))}
        </ul>
        <div className="relative mt-5">{action}</div>
        {!done && (
          <button type="button" onClick={onLater} className="relative mt-3 w-full py-1.5 text-center text-xs font-semibold text-ink-soft hover:text-ink">
            {t("later")}
          </button>
        )}
      </div>

      {/* right: preview + phone QR */}
      <div className="relative hidden flex-col gap-5 border-l border-border bg-surface-2/40 p-7 md:flex">
        <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink-muted transition-colors hover:text-ink">
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </button>
        <div>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">{t("previewCaption")}</p>
          {/* the app in its own window */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_48px_-20px_rgba(0,0,0,0.45)]">
            <div className="flex h-8 items-center gap-2 border-b border-border bg-[#0b1220] px-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
              <img src="/pwa/icon-192.png" alt="" width={16} height={16} className="h-4 w-4 rounded" />
              <span className="flex-1 truncate text-[11px] font-semibold text-white/85">{appName}</span>
              <span className="flex items-center gap-2.5 text-white/60" aria-hidden="true">
                <span className="h-px w-2.5 bg-current" />
                <span className="h-2.5 w-2.5 border border-current" />
                <X className="h-3 w-3" strokeWidth={2.4} />
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
            <img src="/pwa/screens/wide.jpg" alt="" width={1600} height={900} className="block aspect-[16/9] w-full object-cover object-top" />
          </div>
          {/* taskbar / Dock */}
          <div className="mx-auto -mt-1 flex w-fit items-center gap-2 rounded-2xl border border-border bg-surface/80 px-3 py-2 shadow-lg backdrop-blur">
            {["bg-sky-500/70", "bg-amber-500/70"].map((c) => (
              <span key={c} className={`h-7 w-7 rounded-lg ${c} opacity-60`} aria-hidden="true" />
            ))}
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
              <img src="/pwa/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl ring-2 ring-primary/60" />
              <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />
            </span>
            <span className="h-7 w-7 rounded-lg bg-emerald-500/70 opacity-60" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5">
          <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated QR data URL */}
            {qr ? <img src={qr} alt="" width={96} height={96} className="h-full w-full" /> : <span className="h-full w-full animate-pulse rounded-lg bg-zinc-200" />}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
              <Smartphone className="h-4 w-4 text-primary" strokeWidth={2.2} aria-hidden="true" />
              {t("phoneTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t("phoneText")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
