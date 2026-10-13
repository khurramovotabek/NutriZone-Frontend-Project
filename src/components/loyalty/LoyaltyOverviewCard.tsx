"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, ShieldAlert } from "lucide-react";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { formatPercent, formatSom } from "@/components/loyalty/format";

/** Compact wallet/tier strip for the account dashboard -- links to the full /account/loyalty page. Renders nothing if the summary can't load. */
export default function LoyaltyOverviewCard() {
  const t = useTranslations("loyalty.account");
  const [data, setData] = useState<LoyaltySummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/loyalty/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body?.success) setData(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const tier = data.current_tier;
  const next = data.next_tier;
  const accent = tier?.color ?? "#d4a017";

  return (
    <Link href="/account/loyalty" className="nz-liquid nz-liquid-tile group relative mt-6 flex flex-wrap items-center gap-5 overflow-hidden rounded-3xl p-5 sm:flex-nowrap">
      <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
      {tier ? <TierBadge icon={tier.icon} color={tier.color} size={64} className="relative shrink-0 drop-shadow-lg" /> : <CoinIcon size={56} className="relative shrink-0" />}
      <div className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{t("title")}</p>
        <p className="mt-0.5 text-lg font-bold text-ink">
          {tier ? `${tier.name} · ${formatPercent(tier.percent)}%` : t("calcNoTier")}
        </p>
        {next && (
          <div className="mt-2 max-w-sm">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3/70">
              <div className="nz-progress-fill h-full rounded-full" style={{ width: `${Math.max(3, data.progress_percent)}%`, background: `linear-gradient(90deg, ${accent}, ${next.color})` }} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">{t("toTier", { tier: next.name })} · {formatSom(data.amount_to_next)} {t("som")}</p>
          </div>
        )}
        {data.tier_risk && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            {t("riskShort", { tier: data.tier_risk.tier.name, days: data.tier_risk.days_left, amount: formatSom(data.tier_risk.needed) })}
          </p>
        )}
      </div>
      <div className="relative ml-auto flex items-center gap-2 sm:ml-0">
        <CoinIcon size={30} />
        <span className="text-2xl font-extrabold text-ink tabular-nums">{formatSom(data.balance)}</span>
        <ChevronRight className="h-5 w-5 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
      </div>
    </Link>
  );
}
