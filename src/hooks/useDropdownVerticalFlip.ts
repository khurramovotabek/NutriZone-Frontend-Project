"use client";

import { useEffect, useState, type RefObject } from "react";

export type DropdownVerticalStyle = { top: number; bottom?: undefined } | { top?: undefined; bottom: number };

/**
 * Real, closed bug shared by every portaled "floating glass" dropdown
 * in this app (LanguageSwitcher, Combobox, StatusFilterDropdown): each
 * one always anchored its panel via `top: rect.bottom + gap`, opening
 * downward unconditionally. A trigger near the bottom of the viewport
 * (a mobile nav drawer's own footer, a long form scrolled down, a
 * chat toolbar) pushed the panel past `window.innerHeight` -- off
 * screen and unreachable, confirmed live in MobileNav's own language
 * switcher. Anchoring via `bottom` (not `top`) when there isn't
 * `minSpaceBelow` px of room left flips the panel to grow upward from
 * the trigger instead, without needing to know its exact rendered
 * height in advance.
 */
export function useDropdownVerticalFlip(open: boolean, buttonRef: RefObject<HTMLElement | null>, minSpaceBelow: number, gap = 8): DropdownVerticalStyle {
  const [style, setStyle] = useState<DropdownVerticalStyle>({ top: 0 });

  useEffect(() => {
    if (!open) return;
    function update() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < minSpaceBelow && rect.top > spaceBelow;
      setStyle(openUpward ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, buttonRef, minSpaceBelow, gap]);

  return style;
}
