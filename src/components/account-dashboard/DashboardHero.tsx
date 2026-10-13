"use client";

import { Coins, MessageCircle, Package, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useChatUnread } from "@/hooks/useChatUnread";
import { formatDate } from "@/lib/dates";

type GreetingKey = "greetingMorning" | "greetingAfternoon" | "greetingEvening";

function greetingKey(): GreetingKey {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

function todayLabel(locale: string): string {
  return formatDate(new Date(), locale, "weekday");
}

/** Welcome banner for the account dashboard: time-of-day greeting, avatar, and one-tap shortcuts. */
export default function DashboardHero({ fullName, avatarUrl }: { fullName: string | null; avatarUrl: string | null }) {
  const t = useTranslations("account.dashboardPage");
  const tAccount = useTranslations("account");
  const locale = useLocale();
  const chatUnread = useChatUnread();
  const firstName = fullName?.trim().split(/\s+/)[0] ?? "";

  const actions = [
    { href: "/products", label: t("quickShop"), icon: ShoppingBag, primary: true },
    { href: "/orders", label: tAccount("orders"), icon: Package },
    { href: "/account/loyalty", label: tAccount("loyalty"), icon: Coins },
    { href: "/account/chat", label: tAccount("chat"), icon: MessageCircle, badge: chatUnread },
  ];

  return (
    <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_80%_at_100%_100%,color-mix(in_srgb,var(--nz-success)_16%,transparent),transparent_65%)]" />
        <div className="nz-orb -right-20 -top-24 h-64 w-64 bg-[rgba(var(--nz-primary-rgb),0.22)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.55)] to-transparent" />
      </div>

      <div className="relative p-5 sm:p-8">
        <div className="flex items-start gap-4 sm:items-center sm:gap-5">
          <Link href="/profile" className="shrink-0 rounded-full bg-[conic-gradient(from_200deg,var(--nz-primary),var(--nz-success),var(--nz-primary))] p-[2.5px] shadow-[0_14px_32px_-16px_rgba(var(--nz-primary-rgb),0.9)] transition-transform hover:scale-105">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-2 sm:h-16 sm:w-16">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- backend media domain isn't configured in next.config.ts's images.remotePatterns.
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
              )}
            </span>
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft first-letter:uppercase">{todayLabel(locale)}</p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">{firstName ? t(greetingKey(), { name: firstName }) : t("greetingFallback")}</h1>
            <p className="mt-1 hidden text-sm text-ink-muted sm:block">{t("heroSubtitle")}</p>
          </div>
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {actions.map(({ href, label, icon: Icon, primary, badge }) => (
            <Link
              key={href}
              href={href}
              className={`group relative flex flex-col items-start gap-2 rounded-2xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-2.5 sm:text-sm ${
                primary ? "nz-cta" : "border border-border/70 bg-surface/55 text-ink backdrop-blur-sm hover:border-primary/50 hover:text-primary hover:shadow-[0_10px_24px_-14px_rgba(var(--nz-primary-rgb),0.6)]"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${primary ? "bg-white/15" : "bg-primary-soft text-primary"}`}>
                <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="min-w-0 max-w-full leading-tight [overflow-wrap:anywhere]">{label}</span>
              {!!badge && badge > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 sm:static sm:ml-auto items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{badge > 99 ? "99+" : badge}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
