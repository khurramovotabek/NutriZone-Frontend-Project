"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, LayoutGrid, Package, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { openAssistant } from "@/lib/assistant-events";
import { onCartUpdated } from "@/lib/cart-events";
import { haptic, isMiniAppSession } from "@/lib/telegram-webapp";

const TABS = [
  { href: "/", key: "tabHome", icon: Home, match: (p: string) => p === "/" },
  { href: "/products", key: "tabCatalog", icon: LayoutGrid, match: (p: string) => p.startsWith("/products") || p.startsWith("/categories") || p.startsWith("/brands") },
  { href: "/cart", key: "tabCart", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout") },
  { href: "/orders", key: "tabOrders", icon: Package, match: (p: string) => p.startsWith("/orders") },
  { href: "/account", key: "tabProfile", icon: UserRound, match: (p: string) => p.startsWith("/account") || p.startsWith("/profile") || p.startsWith("/loyalty") },
] as const;

/**
 * The Mini App's bottom tab bar -- the app-style navigation a Telegram shopper expects (Home, Catalog, Cart with a live
 * count, Orders, Profile). Rendered only inside Telegram (isMiniAppSession); on the website the normal header does the job.
 */
export default function MiniAppTabBar() {
  const t = useTranslations("miniApp");
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isMiniAppSession()) return;
    let alive = true;
    const load = () =>
      fetch("/api/cart")
        .then((r) => r.json())
        .then((b) => {
          if (!alive) return;
          const items: { quantity: number; status: string }[] = b?.data?.items ?? [];
          setCount(items.filter((i) => i.status !== "removed").reduce((n, i) => n + i.quantity, 0));
        })
        .catch(() => {});
    // the session flag is browser-only state, so the bar appears after hydration
    const id = window.setTimeout(() => {
      if (alive) setOn(true);
    }, 0);
    void load();
    const off = onCartUpdated(() => void load());
    return () => {
      alive = false;
      window.clearTimeout(id);
      off();
    };
  }, []);

  if (!on || pathname.startsWith("/checkout")) return null;
  return (
    <nav className="nz-tg-tabbar" aria-label={t("tabNav")}>
      {TABS.map(({ href, key, icon: Icon, match }, index) => {
        const active = match(pathname);
        // the AI advisor sits in the middle of the bar (its floating launcher is hidden in the Mini App, where it covered prices and buttons)
        const advisor =
          index === 2 ? (
            <button
              key="ai"
              type="button"
              onClick={() => {
                haptic("select");
                openAssistant();
              }}
              className="nz-tg-tab-ai"
            >
              <span className="nz-tg-tab-icon">
                <Sparkles className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="nz-tg-tab-label">{t("tabAssistant")}</span>
            </button>
          ) : null;
        return [advisor, (
          <Link key={href} href={href} onClick={() => haptic("select")} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
            <span className="nz-tg-tab-icon">
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
              {href === "/cart" && count > 0 && <b className="nz-tg-badge">{count > 99 ? "99+" : count}</b>}
            </span>
            <span className="nz-tg-tab-label">{t(key)}</span>
          </Link>
        )];
      })}
    </nav>
  );
}
