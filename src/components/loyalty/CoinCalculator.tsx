"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LoyaltyTier } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { coinsFor, formatPercent, formatSom } from "@/components/loyalty/format";

const PRESETS = [300_000, 1_000_000, 2_500_000, 5_000_000];
const MIN = 100_000;
const MAX = 10_000_000;

/** "How many coins would this order earn?" -- at the customer's current tier, and what the next tier would add. Pure client-side maths on the real tier percentages (1 so'm = 1 coin). */
export default function CoinCalculator({ current, next }: { current: LoyaltyTier | null; next: LoyaltyTier | null }) {
  const t = useTranslations("loyalty.account");
  const [amount, setAmount] = useState(1_000_000);
  const now = current ? coinsFor(amount, current.percent) : 0;
  const later = next ? coinsFor(amount, next.percent) : null;
  const fillPct = ((amount - MIN) / (MAX - MIN)) * 100;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={amount === p} onClick={() => setAmount(p)} className="nz-liquid-chip rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums">
            {formatSom(p)}
          </button>
        ))}
      </div>

      <label htmlFor="nz-coin-calc" className="mt-5 flex items-baseline justify-between text-xs font-medium text-ink-muted">
        <span>{t("calcOrder")}</span>
        <span className="text-lg font-bold text-ink tabular-nums">
          {formatSom(amount)} <span className="text-xs font-medium text-ink-soft">{t("som")}</span>
        </span>
      </label>
      <input
        id="nz-coin-calc"
        type="range"
        min={MIN}
        max={MAX}
        step={100_000}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="nz-range mt-2 w-full"
        style={{ "--fill": `${fillPct}%`, "--accent": current?.color ?? "#d4a017" } as React.CSSProperties}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {current && <TierBadge icon={current.icon} color={current.color} size={16} />}
            {current ? t("calcNow", { tier: current.name, percent: formatPercent(current.percent) }) : t("calcNoTier")}
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-ink tabular-nums">
            <CoinIcon size={26} />+{formatSom(now)}
          </p>
        </div>
        {next && later !== null && (
          <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              <TierBadge icon={next.icon} color={next.color} size={16} />
              {t("calcNext", { tier: next.name, percent: formatPercent(next.percent) })}
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-extrabold tabular-nums" style={{ color: next.color }}>
              <CoinIcon size={26} />+{formatSom(later)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{t("calcMore", { coins: formatSom(later - now) })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
