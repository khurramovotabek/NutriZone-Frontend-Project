"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ShieldAlert } from "lucide-react";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import TierBadge from "@/components/loyalty/TierBadge";
import { formatPercent, formatSom } from "@/components/loyalty/format";
import { formatDate } from "@/lib/dates";

/**
 * "Keep your Gold level": shown when purchases leaving the rolling tier
 * window would drop the customer a level within 30 days. Names the
 * deadline and the exact amount to buy (computed by the backend), with a
 * countdown meter over the 30-day horizon.
 */
export default function TierRiskBanner({ risk }: { risk: NonNullable<LoyaltySummary["tier_risk"]> }) {
  const t = useTranslations("loyalty.account");
  const locale = useLocale();
  const urgency = Math.max(6, Math.min(100, ((30 - risk.days_left) / 30) * 100));

  return (
    <section role="status" aria-labelledby="tier-risk-title" className="nz-liquid nz-tier-risk relative overflow-hidden rounded-3xl p-4 sm:p-5" style={{ "--tier": risk.tier.color } as React.CSSProperties}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0 self-start sm:self-center">
          <TierBadge icon={risk.tier.icon} color={risk.tier.color} size={56} className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg ring-2 ring-surface">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="tier-risk-title" className="text-base font-extrabold tracking-tight text-ink">
              {t("riskTitle", { tier: risk.tier.name })}
            </h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 tabular-nums dark:text-amber-300">{t("riskDays", { days: risk.days_left })}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {t.rich("riskBody", {
              amount: formatSom(risk.needed),
              date: formatDate(risk.drop_date, locale, "long"),
              percent: formatPercent(risk.tier.percent),
              lowerPercent: risk.falls_to ? formatPercent(risk.falls_to.percent) : "0",
              lower: risk.falls_to?.name ?? "—",
              strong: (chunks) => <strong className="font-bold text-ink">{chunks}</strong>,
            })}
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3/70" aria-hidden="true">
            <div className="nz-progress-fill h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${urgency}%` }} />
          </div>
        </div>
        <Link href="/products" className="nz-cta nz-shimmer-btn inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          {t("riskCta")}
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
