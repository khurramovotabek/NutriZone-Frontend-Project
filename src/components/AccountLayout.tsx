"use client";

import { Bell, Coins, LayoutDashboard, LogOut, Mail, MapPin, MessageCircle, Package, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useChatUnread } from "@/hooks/useChatUnread";

const NAV_ITEMS = [
  { href: "/account", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/profile", labelKey: "profile", icon: User },
  { href: "/orders", labelKey: "orders", icon: Package },
  { href: "/account/loyalty", labelKey: "loyalty", icon: Coins },
  { href: "/account/addresses", labelKey: "addresses", icon: MapPin },
  { href: "/account/notifications", labelKey: "notifications", icon: Bell },
  { href: "/account/chat", labelKey: "chat", icon: MessageCircle },
  { href: "/contact", labelKey: "contact", icon: Mail },
  { href: "/account/settings", labelKey: "settings", icon: Settings },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("account");
  const chatUnread = useChatUnread();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Real overflow fix, live-verified: grid items default to
            `min-width: auto`, so this sidebar's own intrinsic content
            width (nine `shrink-0` nav links) forced the whole grid track
            -- and the page itself -- wider than the viewport, bypassing
            the nav's own `overflow-x-auto` entirely (confirmed: page
            scrollWidth was 1161px at a 375px viewport). `min-w-0` lets
            this grid item shrink to its track's real width so the nav's
            horizontal scroll actually contains itself instead. */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:h-fit">
          <nav aria-label={t("navLabel")} className="nz-glass flex snap-x gap-2 overflow-x-auto rounded-2xl p-2 [scrollbar-width:none]! lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
              const isActive = href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="flex-1">{t(labelKey)}</span>
                  {href === "/account/chat" && chatUnread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{chatUnread > 99 ? "99+" : chatUnread}</span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 lg:mt-2"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {t("logout")}
            </button>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
