"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Uses the real native Web Share API (the actual OS share sheet --
 * WhatsApp/Telegram/etc, whatever the visitor has installed) where the
 * browser supports it, e.g. every mobile browser and most desktop
 * Chromium/Safari builds. Falls back to copying the current page's
 * real URL to the clipboard where it's unavailable -- no fabricated
 * "share to <social network>" integrations that don't actually exist
 * for this storefront. Falls back silently (button still visually
 * confirms nothing) if the Clipboard API is also unavailable.
 */
export default function ShareButton({ className = "", title, url, text, iconOnly = false }: { className?: string; title?: string; url?: string; text?: string; iconOnly?: boolean }) {
  const t = useTranslations("product");
  const [copied, setCopied] = useState(false);
  // what to share: a given link (relative ones are made absolute) or, by default, this page
  const target = () => (url ? new URL(url, window.location.origin).toString() : window.location.href);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(target());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable -- no error surfaced, nothing to recover.
    }
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: target() });
        return;
      } catch (err) {
        // AbortError = the visitor closed the native share sheet themselves -- not a failure, nothing to fall back to.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={iconOnly ? t("share") : undefined}
      title={iconOnly ? (copied ? t("linkCopied") : t("share")) : undefined}
      className={`nz-glass flex items-center gap-1.5 rounded-full ${iconOnly ? "h-9 w-9 justify-center" : "px-3.5 py-2"} text-sm font-medium text-ink-muted transition-colors hover:text-primary ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-primary" strokeWidth={2} /> : <Share2 className="h-4 w-4" strokeWidth={1.75} />}
      {!iconOnly && (copied ? t("linkCopied") : t("share"))}
    </button>
  );
}
