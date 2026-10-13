"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * One contact channel (phone / email / Telegram / Instagram) as a
 * liquid-glass row: icon, label, value, a primary action (the whole
 * value is a real tel:/mailto:/https: link) and an optional copy button
 * for values people usually paste elsewhere (phone, email, @username).
 */
export default function ContactChannelCard({
  icon,
  label,
  value,
  href,
  copyValue,
  external = false,
  hint,
  delayMs = 0,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string | null;
  copyValue?: string;
  external?: boolean;
  hint?: string;
  delayMs?: number;
}) {
  const t = useTranslations("contact");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (insecure context / permissions) -- the value is still visible and selectable.
    }
  }

  return (
    <div className="nz-liquid nz-liquid-tile nz-rise group flex items-center gap-4 rounded-2xl p-4 sm:p-5" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="nz-liquid-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</p>
        {href ? (
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-0.5 block truncate text-base font-semibold text-ink transition-colors after:absolute after:inset-0 after:rounded-2xl hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-sm text-ink-muted">{value}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-1.5">
        {copyValue && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t("copied") : t("copyValue", { label })}
            title={copied ? t("copied") : t("copy")}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${copied ? "border-success/40 bg-success/10 text-success" : "border-transparent text-ink-soft hover:border-border hover:bg-surface-2 hover:text-ink"}`}
          >
            {copied ? <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
          </button>
        )}
        {href && (
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary">
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
