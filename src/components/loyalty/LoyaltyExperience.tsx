"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowDownLeft, CheckCircle2, Gift, LogIn, PackageCheck, Percent, ShoppingBag, Sparkles, Ticket, TrendingUp, Wallet } from "lucide-react";
import type { LoyaltySummary, LoyaltyTier } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { formatPercent, formatSom } from "@/components/loyalty/format";

type Status = "loading" | "ready" | "guest" | "error";

const EXAMPLE_ORDER = 1_000_000;

export default function LoyaltyExperience({ tiers }: { tiers: LoyaltyTier[] }) {
  const t = useTranslations("loyalty");
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/loyalty/me")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setStatus("guest");
        const body = await res.json();
        if (!res.ok || !body.success) return setStatus("error");
        setSummary(body.data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSlug = summary?.current_tier?.slug ?? null;

  return (
    <div className="space-y-20">
      {/* HERO */}
      <header className="nz-rise mx-auto max-w-3xl text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl" />
          <CoinIcon size={88} className="nz-coin-float relative drop-shadow-[0_12px_24px_rgba(180,120,10,0.45)]" />
        </div>
        <span className="nz-liquid mt-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} aria-hidden="true" />
          {t("eyebrow")}
        </span>
        <h1 className="nz-gradient-gold mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{t("title")}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">{t("intro")}</p>
      </header>

      {/* WALLET */}
      <section aria-label={t("wallet.label")}>
        {status === "loading" && <WalletSkeleton />}
        {status === "guest" && <GuestWallet />}
        {status === "error" && <p className="nz-liquid rounded-3xl p-8 text-center text-sm text-ink-muted">{t("wallet.loadError")}</p>}
        {status === "ready" && summary && (
          <>
            <WalletPanel summary={summary} />
            <div className="mt-4 text-center">
              <Link href="/account/loyalty" className="nz-cta nz-shimmer-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
                <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {t("wallet.open")}
              </Link>
            </div>
          </>
        )}
      </section>

      {/* TIER LADDER */}
      {tiers.length > 0 && (
        <section aria-labelledby="loyalty-tiers">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="loyalty-tiers" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("tiers.title")}
            </h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">{t("tiers.subtitle")}</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => {
              const isCurrent = tier.slug === currentSlug;
              const example = Math.floor((EXAMPLE_ORDER * Number(tier.percent)) / 100);
              return (
                <li
                  key={tier.id}
                  className={`nz-liquid nz-liquid-tile nz-rise relative flex flex-col overflow-hidden rounded-3xl p-6 ${isCurrent ? "ring-2 ring-offset-0" : ""}`}
                  style={{ animationDelay: `${i * 70}ms`, ...(isCurrent ? ({ "--tw-ring-color": tier.color } as React.CSSProperties) : {}) }}
                >
                  <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-25 blur-2xl" style={{ background: tier.color }} />
                  <div className="flex items-start justify-between gap-3">
                    <TierBadge icon={tier.icon} color={tier.color} size={56} className="drop-shadow-md" />
                    {isCurrent && (
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: tier.color, background: `${tier.color}22`, border: `1px solid ${tier.color}55` }}>
                        {t("tiers.yours")}
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-lg font-bold text-ink">{tier.name}</p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight tabular-nums" style={{ color: tier.color }}>
                      {formatPercent(tier.percent)}%
                    </span>
                    <span className="text-xs font-medium text-ink-soft">{t("tiers.cashback")}</span>
                  </p>
                  <p className="mt-3 text-xs font-medium text-ink-muted">
                    {tier.max_spend ? t("tiers.range", { min: formatSom(tier.min_spend), max: formatSom(tier.max_spend) }) : t("tiers.rangeOpen", { min: formatSom(tier.min_spend) })}
                  </p>
                  {(() => {
                    // Seeded tiers have storefront translations; a tier staff add later shows its own dashboard text.
                    const key = `tierCopy.${tier.slug}`;
                    const text = t.has(key) ? t(key) : tier.description;
                    return text ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p> : null;
                  })()}
                  <div className="mt-auto pt-5">
                    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2 text-xs text-ink-muted">
                      <CoinIcon size={18} />
                      <span>{t("tiers.example", { order: formatSom(EXAMPLE_ORDER), coins: formatSom(example) })}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section aria-labelledby="loyalty-how" className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        <div className="nz-liquid rounded-3xl p-6 sm:p-8">
          <h2 id="loyalty-how" className="text-2xl font-bold tracking-tight text-ink">
            {t("how.title")}
          </h2>
          <ol className="mt-6 space-y-5">
            {([
              { icon: ShoppingBag, key: "buy" },
              { icon: PackageCheck, key: "deliver" },
              { icon: Wallet, key: "credit" },
              { icon: TrendingUp, key: "grow" },
            ] as const).map(({ icon: Icon, key }, i) => (
              <li key={key} className="flex gap-4">
                <div className="nz-liquid-icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-contrast">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{t(`how.${key}.title`)}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{t(`how.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <CoinIcon size={36} />
            <p className="text-sm text-ink">
              <span className="font-bold">{t("how.formulaTitle")}</span> <span className="text-ink-muted">{t("how.formula")}</span>
            </p>
          </div>
        </div>

        <div className="nz-liquid relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
          <h2 className="text-2xl font-bold tracking-tight text-ink">{t("spend.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("spend.subtitle")}</p>
          <ul className="mt-6 space-y-3">
            {([
              { icon: Percent, key: "discount", live: true },
              { icon: Gift, key: "more", live: true },
              { icon: Ticket, key: "promo", live: false },
            ] as const).map(({ icon: Icon, key, live }) => (
              <li key={key} className="relative flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2/40 p-3.5">
                <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${live ? "bg-success/12 text-success" : "bg-amber-500/12 text-amber-600 dark:text-amber-400"}`}>
                  {live ? t("spend.live") : t("spend.later")}
                </span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className="pr-16">
                  <p className="text-sm font-semibold text-ink">{t(`spend.${key}.title`)}</p>
                  <p className="text-xs text-ink-muted">{t(`spend.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}

function WalletPanel({ summary }: { summary: LoyaltySummary }) {
  const t = useTranslations("loyalty");
  const tier = summary.current_tier;
  const next = summary.next_tier;
  const accent = tier?.color ?? "#d4a017";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
      {/* balance */}
      <div className="nz-liquid nz-rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("wallet.balance")}
        </p>
        <div className="mt-4 flex items-center gap-4">
          <CoinIcon size={64} className="nz-coin-float shrink-0 drop-shadow-[0_10px_20px_rgba(180,120,10,0.4)]" />
          <p className="min-w-0">
            <span className="block truncate text-5xl font-extrabold tracking-tight text-ink tabular-nums sm:text-6xl">{formatSom(summary.balance)}</span>
            <span className="text-sm font-medium text-ink-muted">{t("wallet.coins")}</span>
          </p>
        </div>
        <dl className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: t("wallet.earned"), value: formatSom(summary.lifetime_earned), icon: ArrowDownLeft },
            { label: t("wallet.totalSpend"), value: `${formatSom(summary.total_spend)}`, icon: ShoppingBag, suffix: t("wallet.som") },
            { label: t("wallet.orders"), value: formatSom(summary.order_count), icon: PackageCheck },
          ].map(({ label, value, icon: Icon, suffix }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-surface-2/40 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 truncate text-base font-bold text-ink tabular-nums sm:text-lg">
                {value}
                {suffix && <span className="ml-1 text-xs font-medium text-ink-soft">{suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* tier + progress */}
      <div className="nz-liquid nz-rise relative flex flex-col overflow-hidden rounded-3xl p-6 sm:p-8" style={{ animationDelay: "100ms" }}>
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{t("wallet.yourTier")}</p>
        {tier ? (
          <div className="mt-4 flex items-center gap-4">
            <TierBadge icon={tier.icon} color={tier.color} size={72} className="shrink-0 drop-shadow-lg" />
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-ink">{tier.name}</p>
              <p className="text-sm font-semibold" style={{ color: tier.color }}>
                {t("wallet.tierRate", { percent: formatPercent(tier.percent) })}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">{t("wallet.noTier")}</p>
        )}

        <div className="mt-auto pt-8">
          {next ? (
            <>
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>{tier?.name ?? "—"}</span>
                <span className="flex items-center gap-1.5">
                  <TierBadge icon={next.icon} color={next.color} size={18} />
                  {next.name} · {formatPercent(next.percent)}%
                </span>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-surface-3/70"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.progress_percent}
                aria-label={t("wallet.progressLabel", { tier: next.name })}
              >
                <div
                  className="nz-progress-fill h-full rounded-full"
                  style={{ width: `${Math.max(3, summary.progress_percent)}%`, background: `linear-gradient(90deg, ${accent}, ${next.color})` }}
                />
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                {t.rich("wallet.toNext", {
                  amount: formatSom(summary.amount_to_next),
                  tier: next.name,
                  strong: (chunks) => <strong className="font-bold text-ink">{chunks}</strong>,
                })}
              </p>
            </>
          ) : (
            tier && (
              <p className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-2/40 p-3 text-sm font-medium text-ink">
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: tier.color }} strokeWidth={2} aria-hidden="true" />
                {t("wallet.topTier")}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function GuestWallet() {
  const t = useTranslations("loyalty");
  return (
    <div className="nz-liquid nz-rise relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-12">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-48 w-[70%] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="mx-auto flex w-fit -space-x-3">
        <CoinIcon size={44} className="-rotate-12" />
        <CoinIcon size={52} className="relative z-10" />
        <CoinIcon size={44} className="rotate-12" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">{t("guest.title")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{t("guest.body")}</p>
      <Link href="/login?next=/loyalty" className="nz-cta nz-shimmer-btn mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
        <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {t("guest.cta")}
      </Link>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]" aria-hidden="true">
      <div className="nz-liquid h-64 animate-pulse rounded-3xl" />
      <div className="nz-liquid h-64 animate-pulse rounded-3xl" />
    </div>
  );
}
