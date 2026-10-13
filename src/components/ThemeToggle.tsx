"use client";

import { useIsClient } from "@/hooks/useIsClient";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/**
 * Real, product-required simplification: only light/dark remain --
 * "system" was removed entirely per explicit product decision. Both
 * remaining states use the same premium liquid-glass surface/hover
 * treatment as the rest of the header's icon buttons.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useIsClient();


  if (!mounted) {
    return <span className="inline-block h-9 w-9" aria-hidden="true" />;
  }

  // The provider defaults to "system", so `theme` is "system" until the first toggle -- what's on screen is resolvedTheme.
  const current = resolvedTheme === "dark" ? "dark" : "light";
  const next = current === "light" ? "dark" : "light";
  const Icon = current === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t(next)}
      title={t(next)}
      className="nz-glass group flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:text-primary"
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
