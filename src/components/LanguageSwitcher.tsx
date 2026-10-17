"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { switchLocale } from "@/i18n/locale-cookie";
import { useDropdownVerticalFlip } from "@/hooks/useDropdownVerticalFlip";

const LOCALE_FLAGS: Record<Locale, string> = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇬🇧",
};

/**
 * Real, closed gap: this used to be a bare native `<select>` inside a
 * `.nz-glass` pill -- functional, but visually flat next to every
 * other floating surface in the app (Catalog, filters, the account
 * menu). Rebuilt on the exact same premium floating-glass dropdown
 * pattern `LoginLanguageSwitcher` already uses for the login page
 * (`nz-glass-strong` panel, `animate-nz-fade-in`, outside-click/Escape
 * to close, `Check` on the active option) -- one consistent language-
 * picker experience across the site instead of two different ones.
 *
 * The panel is rendered through a portal into `document.body`,
 * positioned from the trigger button's own `getBoundingClientRect()`.
 * `.nz-glass` sets `backdrop-filter`, which -- per spec -- makes its
 * own element a stacking context; nested one `.nz-glass` Card inside
 * another stacking-context sibling (e.g. the Language card sitting
 * above the Security card on /account/settings) trapped this panel's
 * `z-50` *inside* the Language card's own paint layer, so it rendered
 * behind the next card regardless of z-index. A portal escapes every
 * ancestor stacking context, so the panel always paints on top no
 * matter which card -- or how many -- it's opened from.
 */
/** `compact` (the desktop header): flag + 2-letter code on the button; the menu always lists full names. */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const [right, setRight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);


  // See useDropdownVerticalFlip's own docstring for the real, closed bug this fixes.
  const verticalStyle = useDropdownVerticalFlip(open, buttonRef, SUPPORTED_LOCALES.length * 44 + 24);

  useEffect(() => {
    if (!open) return;
    function updateRight() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setRight(window.innerWidth - rect.right);
    }
    updateRight();
    window.addEventListener("scroll", updateRight, true);
    window.addEventListener("resize", updateRight);
    return () => {
      window.removeEventListener("scroll", updateRight, true);
      window.removeEventListener("resize", updateRight);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
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
    if (next === locale) return;
    switchLocale(next, router);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        className={`flex items-center ${compact ? "gap-1.5 px-2.5" : "gap-2 px-3"} rounded-full py-1.5 text-sm transition-all duration-200 ${
          open ? "nz-cta" : "nz-glass text-ink-muted hover:text-primary"
        }`}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {LOCALE_FLAGS[locale]}
        </span>
        <span className="font-medium">{compact ? locale.toUpperCase() : t(locale)}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            aria-label={t("label")}
            style={{ ...verticalStyle, right }}
            className="nz-glass-strong animate-nz-fade-in fixed z-50 min-w-[170px] overflow-hidden rounded-2xl py-1.5"
          >
            {SUPPORTED_LOCALES.map((code) => {
              const active = code === locale;
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => selectLocale(code)}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 ${active ? "font-semibold text-primary" : "text-ink"}`}
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {LOCALE_FLAGS[code]}
                    </span>
                    <span className="flex-1">{t(code)}</span>
                    {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
