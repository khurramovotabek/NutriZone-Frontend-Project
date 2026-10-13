"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Home, ShoppingCart, User } from "lucide-react";
import { useTranslations } from "next-intl";

const SCROLL_THRESHOLD = 320; // roughly "past the hero/filter area" on the catalog page
const COLLAPSED_KEY = "nz-scroll-nav-collapsed";

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function readCollapsed(): boolean {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Real, product-required capability: the main top navbar stays exactly
 * where it is -- this does NOT replace it or turn the whole layout
 * into a persistent sidebar. Instead, once the visitor scrolls down
 * far enough on the Product List page (top navbar links are no longer
 * in easy reach), a small, floating glass rail of quick-access links
 * appears on the left edge. The visitor can collapse/expand it at
 * any time; the collapsed state persists for the rest of the session
 * (sessionStorage) so it doesn't reappear expanded on every scroll.
 */
export default function ScrollSideNav() {
  const t = useTranslations("navigation");
  const visible = useSyncExternalStore(subscribeScroll, () => window.scrollY > SCROLL_THRESHOLD, () => false);
  // Safe as a lazy initializer: nothing renders until `visible`, which is
  // always false during SSR/hydration.
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // Storage unavailable (private mode) -- the toggle still works for this page.
      }
      return next;
    });
  }

  if (!visible) return null;

  const links = [
    { href: "/", label: t("homepage"), icon: Home },
    { href: "/wishlist", label: t("wishlist"), icon: Heart },
    { href: "/cart", label: t("cart"), icon: ShoppingCart },
    { href: "/account", label: t("login"), icon: User },
  ];

  return (
    <div className="animate-nz-fade-in fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 sm:block">
      <div className={`nz-glass flex flex-col items-center gap-1 rounded-r-2xl border-l-0 py-3 transition-all duration-300 ${collapsed ? "px-1.5" : "px-2.5"}`}>
        {!collapsed &&
          links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary">
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ))}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t("expandQuickNav") : t("collapseQuickNav")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 ${collapsed ? "" : "mt-1"}`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
