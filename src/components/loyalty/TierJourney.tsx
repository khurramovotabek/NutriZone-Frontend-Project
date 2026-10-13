"use client";

import { useState } from "react";
import { Check, Crown, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { LoyaltyTier } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { coinsFor, formatCompact, formatPercent, formatSom } from "@/components/loyalty/format";

/**
 * All tiers as one horizontal journey: reached tiers in full colour, the
 * current one lifted and glowing, the rest desaturated with a lock. The
 * track fills to the customer's exact position, including the partial
 * progress towards the next tier. Each level is a button: the glass panel
 * below shows what it gives and how far away it is. Scrolls horizontally on
 * narrow screens.
 */
export default function TierJourney({ tiers, currentSlug, progress, totalSpend }: { tiers: LoyaltyTier[]; currentSlug: string | null; progress: number; totalSpend: number }) {
  const t = useTranslations("loyalty.account");
  const locale = useLocale();
  const currentIndex = tiers.findIndex((tier) => tier.slug === currentSlug);
  const [selected, setSelected] = useState(Math.max(0, currentIndex));
  const segments = Math.max(1, tiers.length - 1);
  const position = currentIndex < 0 ? 0 : Math.min(segments, currentIndex + (currentIndex < segments ? progress / 100 : 0));
  const fill = (position / segments) * 100;
  const current = currentIndex >= 0 ? tiers[currentIndex] : null;
  const next = currentIndex >= 0 && currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  const edge = 50 / tiers.length; // track runs centre-of-first to centre-of-last badge

  const picked = tiers[selected] ?? tiers[0];
  const pickedReached = currentIndex >= 0 && selected <= currentIndex;
  const need = Math.max(0, Number(picked.min_spend) - totalSpend);

  return (
    <div>
      <div className="-mx-2 overflow-x-auto px-2 pb-2 scrollbar-none">
        <ol className="relative flex min-w-[720px] justify-between pt-3">
          <span aria-hidden="true" className="absolute top-[41px] h-1.5 rounded-full bg-surface-3/70" style={{ left: `${edge}%`, right: `${edge}%` }} />
          <span
            aria-hidden="true"
            className="nz-journey-fill absolute top-[41px] h-1.5 rounded-full"
            style={{ left: `${edge}%`, width: `calc(${fill}% * ${(100 - 2 * edge) / 100})`, background: `linear-gradient(90deg, ${tiers[0]?.color ?? "#999"}, ${current?.color ?? "#999"}${next ? `, ${next.color}` : ""})` }}
          />
          {tiers.map((tier, i) => {
            const reached = currentIndex >= 0 && i <= currentIndex;
            const isCurrent = i === currentIndex;
            const isSelected = i === selected;
            return (
              <li key={tier.id} className="relative z-10 flex flex-1 justify-center" aria-current={isCurrent ? "step" : undefined}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(i)}
                  className={`nz-tier-node flex w-full max-w-[96px] flex-col items-center rounded-2xl px-1 pb-2 pt-1.5 text-center ${isSelected ? "is-selected" : ""}`}
                  style={{ "--tier": tier.color } as React.CSSProperties}
                >
                  <span className={`relative transition-transform duration-300 ${isCurrent ? "-translate-y-1 scale-110" : ""}`}>
                    {isCurrent && <span aria-hidden="true" className="nz-journey-pulse absolute inset-0 rounded-full" style={{ background: `${tier.color}55` }} />}
                    <TierBadge icon={tier.icon} color={tier.color} size={52} className={`relative ${reached ? "drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]" : "opacity-45 grayscale"}`} title={tier.name} />
                    {!reached && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-ink-soft ring-1 ring-border">
                        <Lock className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className={`mt-2.5 text-xs font-bold ${isCurrent ? "text-ink" : reached ? "text-ink-muted" : "text-ink-soft"}`}>{tier.name}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: reached ? tier.color : undefined }}>
                    {formatPercent(tier.percent)}%
                  </span>
                  <span className="text-[10px] text-ink-soft tabular-nums">{Number(tier.min_spend) === 0 ? t("journeyStart") : `${formatCompact(tier.min_spend)}+`}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* selected level */}
      <div key={picked.id} className="nz-tier-detail nz-rise mt-3 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5" style={{ "--tier": picked.color } as React.CSSProperties} aria-live="polite">
        <TierBadge icon={picked.icon} color={picked.color} size={64} className={`shrink-0 self-center ${pickedReached ? "drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]" : "opacity-70 grayscale-[0.6]"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-extrabold tracking-tight text-ink">{picked.name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${selected === currentIndex ? "nz-tier-pill" : pickedReached ? "bg-success/12 text-success" : "bg-surface-3/70 text-ink-soft"}`}>
              {selected === currentIndex ? <Crown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" /> : pickedReached ? <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" /> : <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
              {selected === currentIndex ? t("tierCurrent") : pickedReached ? t("tierReached") : t("tierLocked")}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {/* staff write the description in Uzbek only */}
            {(locale === "uz" && picked.description) || (Number(picked.min_spend) === 0 ? t("tierStart") : t("tierFrom", { amount: formatSom(picked.min_spend) }))}
          </p>
          {!pickedReached && need > 0 && <p className="mt-1.5 text-xs font-semibold text-ink">{t("tierNeed", { amount: formatSom(need) })}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
          <p className="text-3xl font-black tabular-nums" style={{ color: picked.color }}>
            {formatPercent(picked.percent)}%<span className="ml-1 text-xs font-semibold text-ink-soft">{t("rateLabel")}</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-ink-muted tabular-nums">
            <CoinIcon size={14} />
            {t("tierPer", { coins: formatSom(coinsFor(1_000_000, picked.percent)) })}
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-soft sm:hidden">{t("tierHint")}</p>
    </div>
  );
}
