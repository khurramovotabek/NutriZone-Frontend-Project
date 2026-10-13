"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useDropdownVerticalFlip } from "@/hooks/useDropdownVerticalFlip";

export interface ComboboxOption {
  value: string;
  label: string;
}

/**
 * Real, closed gap: the native `<select>` used for Region/City (and
 * every other form dropdown that isn't a small fixed enum already
 * covered by `StatusFilterDropdown`/`LanguageSwitcher`) rendered its
 * open popup with the browser's own OS-default appearance -- a plain
 * white list with no theme, unreadable next to this app's dark
 * "Liquid Glass" surfaces. `globals.css` never targeted `select`/
 * `option` at all, and doing so reliably across browsers isn't
 * possible anyway (Chromium/Firefox only partially respect `color`/
 * `background-color` on `<option>`, and neither lets CSS touch the
 * popup's hover/selected treatment). This is the exact same premium
 * floating-glass dropdown pattern `StatusFilterDropdown`/
 * `LanguageSwitcher` already established (portaled to `document.body`,
 * positioned from the trigger's own rect, `nz-glass-strong` panel,
 * outside-click/Escape to close, `Check` on the active option) --
 * generalized here into a reusable, full-width form control (sized
 * like `.nz-glass-input`) instead of a small pill button, since this
 * one has to stand in for a real `<select>` inside forms.
 */
export default function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  disabled = false,
  loading = false,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const [horizontal, setHorizontal] = useState({ left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);


  // See useDropdownVerticalFlip's own docstring for the real, closed bug
  // this fixes -- a Region/City field near the bottom of a scrolled form
  // (this component's own real, documented use case) previously always
  // opened its panel downward, off-screen. `max-h-72` (288px) caps how
  // tall this panel can ever get, so that's the room it needs to check for.
  const verticalStyle = useDropdownVerticalFlip(open, buttonRef, 288 + 16);

  useEffect(() => {
    if (!open) return;
    function updateHorizontal() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setHorizontal({ left: rect.left, width: rect.width });
    }
    updateHorizontal();
    window.addEventListener("scroll", updateHorizontal, true);
    window.addEventListener("resize", updateHorizontal);
    return () => {
      window.removeEventListener("scroll", updateHorizontal, true);
      window.removeEventListener("resize", updateHorizontal);
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
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = Math.max(options.findIndex((o) => o.value === value), 0);
    optionRefs.current[selectedIndex]?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function focusOptionAt(index: number) {
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    optionRefs.current[clamped]?.focus();
    optionRefs.current[clamped]?.scrollIntoView({ block: "nearest" });
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOptionAt(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusOptionAt(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusOptionAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusOptionAt(options.length - 1);
    }
  }

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="nz-glass-input flex w-full items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-left disabled:opacity-50"
      >
        <span className={`truncate ${selectedLabel ? "text-ink" : "text-ink-soft"}`}>
          {loading ? "..." : selectedLabel || placeholder}
        </span>
        {loading ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            aria-label={placeholder}
            style={{ ...verticalStyle, left: horizontal.left, width: horizontal.width }}
            className="nz-glass-strong animate-nz-fade-in fixed z-[100] max-h-72 overflow-y-auto rounded-2xl py-1.5"
          >
            {options.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-ink-soft">{emptyMessage}</li>
            ) : (
              options.map((option, index) => {
                const active = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={active}>
                    <button
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        buttonRef.current?.focus();
                      }}
                      onKeyDown={(e) => handleOptionKeyDown(e, index)}
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none ${
                        active ? "font-semibold text-primary" : "text-ink"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
