"use client";

import { useEffect, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { Coins, Heart, LayoutDashboard, LayoutGrid, Mail, MapPin, Menu, MessageCircle, Package, Settings, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Full-height off-canvas drawer (not the small anchored dropdown this
 * used to be) -- same `.nz-glass-strong` + `animate-nz-drawer-in` +
 * backdrop pattern CatalogButton's own mobile drawer already
 * established (see that file), reused here for visual consistency
 * rather than inventing a second drawer style. Language and theme
 * (previously two more icon buttons crammed into the header's own
 * xl:hidden row, the real cause of that row overflowing horizontally
 * on narrow phones) now live in this drawer's footer instead.
 *
 * Portaled to `document.body`, live-verified necessary: the trigger
 * button renders inside `<header className="nz-glass ...">`, and
 * `nz-glass` sets `backdrop-filter` -- which, per spec, makes its own
 * element a new containing block for `position: fixed` descendants.
 * Without the portal, this panel's `fixed inset-y-0` resolved against
 * the ~62px-tall header box instead of the real viewport (confirmed via
 * a real DOM measurement: the panel rendered at height 62 instead of
 * the full screen, squashing all nine nav links into an unusable
 * sliver). Same root cause and same fix as LanguageSwitcher's own
 * portaled dropdown.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const t = useTranslations("navigation");
  const tAccount = useTranslations("account");
  const tCommon = useTranslations("common");


  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const NAV_ITEMS = [
    { href: "/products", label: t("catalog"), icon: LayoutGrid },
    { href: "/wishlist", label: t("wishlist"), icon: Heart },
    { href: "/cart", label: t("cart"), icon: ShoppingCart },
    { href: "/orders", label: t("orders"), icon: Package },
    { href: "/account/loyalty", label: t("loyalty"), icon: Coins },
    { href: "/account/addresses", label: tAccount("addresses"), icon: MapPin },
    { href: "/account", label: tAccount("dashboard"), icon: LayoutDashboard },
    { href: "/account/chat", label: tAccount("chat"), icon: MessageCircle },
    { href: "/account/settings", label: tAccount("settings"), icon: Settings },
    { href: "/contact", label: tAccount("contact"), icon: Mail },
  ];

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={tCommon("openMenu")}
        className="nz-glass flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:text-primary"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              id="mobile-nav-panel"
              className="nz-glass-strong fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm animate-nz-drawer-in flex-col border-y-0 border-r-0"
              style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="text-lg font-semibold text-ink">{t("home")}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={tCommon("closeMenu")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2"
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 text-sm">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium text-ink transition-colors hover:bg-primary-soft hover:text-primary"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center justify-between gap-2 border-t border-border p-4">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
