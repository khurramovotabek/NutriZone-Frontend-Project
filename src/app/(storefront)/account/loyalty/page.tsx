"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowRight, CalendarClock, Calculator, Crown, Gift, History, Hourglass, Info, LayoutGrid, Map as MapIcon, PackageCheck, ShoppingBag, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import AccountLayout from "@/components/AccountLayout";
import { ErrorState } from "@/components/ui";
import CoinCalculator from "@/components/loyalty/CoinCalculator";
import CoinIcon from "@/components/loyalty/CoinIcon";
import ExpirySchedule from "@/components/loyalty/ExpirySchedule";
import LoyaltyHistory from "@/components/loyalty/LoyaltyHistory";
import MembershipCard from "@/components/loyalty/MembershipCard";
import ProgressRing from "@/components/loyalty/ProgressRing";
import ReferralCard from "@/components/loyalty/ReferralCard";
import TierBadge from "@/components/loyalty/TierBadge";
import TierJourney from "@/components/loyalty/TierJourney";
import TierRiskBanner from "@/components/loyalty/TierRiskBanner";
import { formatPercent, formatSom } from "@/components/loyalty/format";
import { formatDate } from "@/lib/dates";

type Tab = "overview" | "history" | "invite";
const TABS: Tab[] = ["overview", "history", "invite"];
const TAB_ICON = { overview: LayoutGrid, history: History, invite: Gift } as const;

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.slice(1) as Tab;
  return TABS.includes(hash) ? hash : "overview";
}

export default function AccountLoyaltyPage() {
  const t = useTranslations("loyalty.account");
  const tl = useTranslations("loyalty");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [data, setData] = useState<LoyaltySummary | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState<"login" | "load" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Rendered only after the summary loads (client-side), so reading the hash here can't cause a hydration mismatch.
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/loyalty/me")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setError("login");
        const body = await res.json();
        if (!res.ok || !body.success) return setError("load");
        setData(body.data);
        setLoadedAt(Date.now());
      })
      .catch(() => {
        if (!cancelled) setError("load");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function openTab(next: Tab, scroll = false) {
    setTab(next);
    window.history.replaceState(null, "", next === "overview" ? window.location.pathname : `#${next}`);
    if (scroll) document.getElementById("rewards-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (error) {
    return (
      <AccountLayout>
        <ErrorState
          message={error === "login" ? tl("guest.body") : tl("wallet.loadError")}
          action={
            error === "login" ? (
              <Link href="/login?next=/account/loyalty" className="nz-cta rounded-full px-5 py-2.5 text-sm font-semibold">
                {tl("guest.cta")}
              </Link>
            ) : (
              <button type="button" onClick={() => (setError(null), setReloadKey((k) => k + 1))} className="nz-liquid-chip rounded-full px-5 py-2.5 text-sm font-semibold">
                {tc("retry")}
              </button>
            )
          }
        />
      </AccountLayout>
    );
  }

  if (!data) {
    return (
      <AccountLayout>
        <div className="space-y-5" aria-hidden="true">
          <div className="h-12 w-64 animate-pulse rounded-2xl bg-surface-3/50" />
          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <div className="nz-liquid aspect-[1.586] animate-pulse rounded-[28px]" />
            <div className="nz-liquid min-h-64 animate-pulse rounded-[28px]" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="nz-liquid h-24 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="nz-liquid h-56 animate-pulse rounded-3xl" />
        </div>
      </AccountLayout>
    );
  }

  const tier = data.current_tier;
  const next = data.next_tier;
  const accent = tier?.color ?? "#d4a017";
  const tabs = data.programme.referral_enabled ? TABS : TABS.filter((x) => x !== "invite");
  const activeTab = tabs.includes(tab) ? tab : "overview";

  const stats = [
    { icon: ArrowDownLeft, label: t("statEarned"), value: formatSom(data.lifetime_earned), coin: true, tone: "#10b981" },
    { icon: Wallet, label: t("statUsed"), value: formatSom(data.lifetime_spent), coin: true, hint: t("statUsedHint"), tone: "#f59e0b" },
    { icon: ShoppingBag, label: t("statSpend"), value: formatSom(data.total_spend), suffix: t("som"), tone: "#3b82f6" },
    { icon: PackageCheck, label: t("statOrders"), value: formatSom(data.order_count), tone: "#8b5cf6" },
  ];

  const rules = [
    { icon: ShoppingCart, title: t("ruleRedeemTitle"), body: t("ruleRedeemBody", { percent: data.programme.max_redeem_percent }), show: data.programme.redeem_enabled },
    { icon: Hourglass, title: t("ruleExpiryTitle"), body: t("ruleExpiryBody", { days: data.programme.coin_expiry_days }), show: data.programme.coin_expiry_days > 0 },
    { icon: CalendarClock, title: t("ruleWindowTitle"), body: t("ruleWindowBody", { days: data.programme.tier_window_days }), show: data.programme.tier_window_days > 0 },
  ].filter((r) => r.show);

  return (
    <AccountLayout>
      <div className="nz-rewards relative isolate space-y-6" style={{ "--tier": accent, "--tier-next": next?.color ?? accent } as React.CSSProperties}>
        <div aria-hidden="true" className="nz-rewards-aurora" />

        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {tl("eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">{t("title")}</h1>
          </div>
          <Link href="/loyalty" className="nz-liquid-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold">
            <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("aboutProgram")}
          </Link>
        </header>

        {data.tier_risk && <TierRiskBanner risk={data.tier_risk} />}

        {data.expiring && (
          <div role="status" className="nz-liquid flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-ink">
              {t.rich("expiringBanner", {
                coins: formatSom(data.expiring.coins),
                date: formatDate(data.expiring.first_expiry, locale, "long"),
                strong: (chunks) => <strong className="font-bold">{chunks}</strong>,
              })}
            </p>
            <Link href="/products" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-amber-700 hover:underline sm:inline-flex dark:text-amber-300">
              {t("expiringCta")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* hero: card + status */}
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <MembershipCard tier={tier} balance={data.balance} memberName={data.member_name} memberSince={data.member_since} />

          <div className="nz-liquid nz-rewards-status relative flex flex-col overflow-hidden rounded-[28px] p-5 sm:p-6">
            <div className="flex flex-1 items-center gap-5">
              {next ? (
                <>
                  <ProgressRing value={data.progress_percent} from={accent} to={next.color} size={132} stroke={10}>
                    <TierBadge icon={next.icon} color={next.color} size={38} />
                    <p className="mt-0.5 text-xl font-extrabold text-ink tabular-nums">{data.progress_percent}%</p>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{t("toTier", { tier: next.name })}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {t.rich("remaining", {
                        amount: formatSom(data.amount_to_next),
                        tier: next.name,
                        percent: formatPercent(next.percent),
                        strong: (chunks) => <strong className="font-bold text-ink">{chunks}</strong>,
                      })}
                    </p>
                    {data.programme.tier_window_days > 0 && <p className="mt-2 text-[11px] text-ink-soft">{t("windowNote", { days: data.programme.tier_window_days })}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative shrink-0">
                    <span aria-hidden="true" className="absolute inset-0 rounded-full blur-2xl" style={{ background: `${accent}55` }} />
                    {tier && <TierBadge icon={tier.icon} color={tier.color} size={104} className="relative" />}
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-lg font-bold text-ink">
                      <Crown className="h-5 w-5" style={{ color: accent }} strokeWidth={2} aria-hidden="true" />
                      {t("topTitle")}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{t("topBody", { percent: tier ? formatPercent(tier.percent) : "" })}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/30 bg-white/25 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <CoinIcon size={18} />
                {t("balanceWorth", { amount: formatSom(data.balance) })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/products" className="nz-cta nz-shimmer-btn inline-flex min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  {t("useCoins")}
                </Link>
                {data.programme.referral_enabled ? (
                  <button type="button" onClick={() => openTab("invite", true)} className="nz-liquid-chip inline-flex min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold">
                    <Gift className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("inviteCta")}
                  </button>
                ) : (
                  <Link href="/loyalty" className="nz-liquid-chip inline-flex min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold">
                    <Info className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("aboutProgram")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, suffix, coin, hint, tone }) => (
            <div key={label} className="nz-liquid nz-liquid-tile nz-kpi relative overflow-hidden rounded-2xl p-4" style={{ "--kpi": tone } as React.CSSProperties}>
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                <span className="nz-kpi-icon flex h-7 w-7 items-center justify-center rounded-lg">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-3 flex items-center gap-1.5 truncate text-xl font-extrabold text-ink tabular-nums sm:text-2xl">
                {coin && <CoinIcon size={20} />}
                {value}
                {suffix && <span className="text-xs font-medium text-ink-soft">{suffix}</span>}
              </dd>
              {hint && <p className="mt-0.5 truncate text-[11px] text-ink-soft">{hint}</p>}
            </div>
          ))}
        </dl>

        {/* tabs */}
        <div id="rewards-tabs" className="sticky top-[72px] z-20 -mx-1 scroll-mt-24 px-1 py-1">
          <div role="tablist" aria-label={t("title")} className="nz-seg nz-seg-lg w-full sm:w-auto">
            {tabs.map((key) => {
              const Icon = TAB_ICON[key];
              return (
                <button
                  key={key}
                  id={`tab-${key}`}
                  role="tab"
                  type="button"
                  aria-selected={activeTab === key}
                  aria-controls={`panel-${key}`}
                  onClick={() => openTab(key)}
                  className="nz-seg-btn flex-1 sm:flex-none"
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  {t(`tabs.${key}`)}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "overview" && (
          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="nz-rise space-y-6">
            {data.tiers.length > 0 && (
              <section className="nz-liquid rounded-3xl p-5 sm:p-6" aria-labelledby="journey-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="journey-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
                    <MapIcon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
                    {t("journeyTitle")}
                  </h2>
                  <p className="text-xs text-ink-muted">{t("journeyHint", { count: data.tiers.length })}</p>
                </div>
                <TierJourney tiers={data.tiers} currentSlug={tier?.slug ?? null} progress={data.progress_percent} totalSpend={Number(data.total_spend)} />
              </section>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
              <section className="nz-liquid rounded-3xl p-5 sm:p-6" aria-labelledby="calc-title">
                <h2 id="calc-title" className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
                  <Calculator className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  {t("calcTitle")}
                </h2>
                <p className="mb-5 text-sm text-ink-muted">{t("calcSubtitle")}</p>
                <CoinCalculator current={tier} next={next} />
              </section>
              <ExpirySchedule schedule={data.expiry_schedule ?? []} balance={data.balance} now={loadedAt} />
            </div>

            <section aria-labelledby="recent-title">
              <h2 id="recent-title" className="mb-3 text-lg font-bold tracking-tight text-ink">
                {t("recentTitle")}
              </h2>
              <LoyaltyHistory compact onSeeAll={() => openTab("history", true)} />
            </section>

            {rules.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {rules.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="nz-liquid flex gap-3 rounded-2xl p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-500/5 text-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:text-amber-400">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="nz-rise">
            <LoyaltyHistory />
          </div>
        )}

        {activeTab === "invite" && (
          <div id="panel-invite" role="tabpanel" aria-labelledby="tab-invite" className="nz-rise">
            <ReferralCard referral={data.referral} programme={data.programme} onClaimed={() => setReloadKey((k) => k + 1)} />
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
