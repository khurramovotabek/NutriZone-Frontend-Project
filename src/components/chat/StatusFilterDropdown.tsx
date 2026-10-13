"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDropdownVerticalFlip } from "@/hooks/useDropdownVerticalFlip";

export type StatusFilter = "all" | "open" | "closed" | "archived";
const OPTIONS: StatusFilter[] = ["all", "open", "closed", "archived"];

/**
 * Same premium floating-glass dropdown pattern as `LanguageSwitcher`
 * (portaled to `document.body`, positioned from the trigger's own
 * rect) -- filters the real `GET /chat/conversations?filter[status]=`
 * the backend already supports (see `getMyConversations`), never a
 * fabricated status.
 */
export default function StatusFilterDropdown({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  const t = useTranslations("account.chatPage.filter");
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const [left, setLeft] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);


  // See useDropdownVerticalFlip's own docstring for the real, closed bug this fixes.
  const verticalStyle = useDropdownVerticalFlip(open, buttonRef, OPTIONS.length * 40 + 16);

  useEffect(() => {
    if (!open) return;
    function updateLeft() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setLeft(rect.left);
    }
    updateLeft();
    window.addEventListener("scroll", updateLeft, true);
    window.addEventListener("resize", updateLeft);
    return () => {
      window.removeEventListener("scroll", updateLeft, true);
      window.removeEventListener("resize", updateLeft);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
      >
        {t(value)}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            style={{ ...verticalStyle, left }}
            className="nz-glass-strong animate-nz-fade-in fixed z-[100] min-w-[150px] overflow-hidden rounded-2xl py-1.5"
          >
            {OPTIONS.map((option) => {
              const active = option === value;
              return (
                <li key={option} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${active ? "font-semibold text-primary" : "text-ink"}`}
                  >
                    {t(option)}
                    {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
