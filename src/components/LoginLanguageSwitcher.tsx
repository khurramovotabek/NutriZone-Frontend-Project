"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { switchLocale } from "@/i18n/locale-cookie";

const LOCALE_LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };
const LOCALE_FLAGS: Record<Locale, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

/**
 * Real, closed bug: the previous implementation showed the current
 * locale's flag in a <span> right next to a native <select> -- but a
 * closed native <select> always renders its own selected <option>'s
 * full text (which already included that same flag), so the flag
 * appeared twice (e.g. "🇬🇧 🇬🇧 English"). This custom dropdown shows
 * the current locale's flag+name exactly once, closes on outside
 * click or Escape, and is fully keyboard-navigable.
 */
export default function LoginLanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("language");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === currentLocale) return;
    switchLocale(next, router);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        className="nz-glass flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:text-primary"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {LOCALE_FLAGS[currentLocale as Locale]}
        </span>
        <span className="font-medium">{LOCALE_LABELS[currentLocale as Locale]}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <ul role="listbox" aria-label={t("label")} className="nz-glass-strong animate-nz-fade-in absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl py-1.5">
          {SUPPORTED_LOCALES.map((code) => {
            const active = code === currentLocale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => selectLocale(code)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 ${active ? "text-primary" : "text-ink"}`}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {LOCALE_FLAGS[code]}
                  </span>
                  <span className="flex-1 font-medium">{LOCALE_LABELS[code]}</span>
                  {active && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
