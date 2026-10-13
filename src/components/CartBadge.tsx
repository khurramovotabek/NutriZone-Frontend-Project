"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { onCartUpdated } from "@/lib/cart-events";

/**
 * `compact`: the mobile header icon-button treatment (same `h-9 w-9`
 * circular touch target as MobileSearchOverlay/WishlistBadge/
 * ThemeToggle) -- the label was already hidden on this breakpoint via
 * `hidden xl:inline` below, this only adds the matching background/
 * padding so the tap target isn't just the bare 20px icon. Desktop
 * usage (no prop) is completely unchanged.
 */
export default function CartBadge({ compact = false }: { compact?: boolean } = {}) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      fetch("/api/cart")
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (cancelled || !body?.success) return;
          const activeItems = (body.data.items ?? []).filter((i: { status: string }) => i.status !== "removed");
          setCount(activeItems.length);
        })
        .catch(() => {
          // Not logged in, or no cart yet -- show no badge rather than a fake count.
        });
    }
    refresh();
    // Real navigation still refetches (a fresh page load is the one case
    // an external cart mutation, e.g. from another tab, should surface
    // here); every mutation *this* tab makes fires cart-updated directly
    // instead of waiting for a navigation that may never happen.
    const unsubscribe = onCartUpdated(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pathname]);

  return (
    <Link
      href="/cart"
      className={
        compact
          ? "relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-primary"
          : "relative inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-primary"
      }
      aria-label={count ? `${t("cart")}, ${count}` : t("cart")}
    >
      <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      {!compact && <span className="hidden xl:inline">{t("cart")}</span>}
      {count !== null && count > 0 && (
        <span
          className={`nz-cta absolute inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
            compact ? "-right-0.5 -top-0.5" : "-right-2.5 -top-2.5"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
