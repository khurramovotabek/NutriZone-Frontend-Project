"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { CheckoutPreview } from "@/lib/cart-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { formatSom } from "@/components/loyalty/format";

/**
 * "Pay with coins" at checkout: a switch plus a slider bounded by the
 * server's own limits (preview.loyalty: balance, the max-share cap and the
 * minimum). 1 coin = 1 so'm. The value is re-validated server-side at order
 * creation -- this component only chooses it.
 */
export default function CoinRedeemCard({ loyalty, value, onChange }: { loyalty: NonNullable<CheckoutPreview["loyalty"]>; value: number; onChange: (coins: number) => void }) {
  const t = useTranslations("checkout.coins");
  const max = loyalty.max_redeemable;
  const min = Math.min(loyalty.min_coins, max);
  const on = value > 0;
  const available = loyalty.enabled && max > 0;
  const step = max >= 10_000 ? 1_000 : 100;
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 100;

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${on ? "border-amber-500/40 bg-amber-500/[0.07]" : "border-border bg-surface"}`}>
      {on && <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-400/25 blur-3xl" />}
      <div className="relative flex items-start gap-4">
        <CoinIcon size={44} className={on ? "nz-coin-float shrink-0" : "shrink-0"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">{t("title")}</p>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={!available}
              onClick={() => onChange(on ? 0 : max)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-amber-500" : "bg-surface-3"}`}
              aria-label={t("title")}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("balance", { balance: formatSom(loyalty.balance) })} · {t("rule", { percent: loyalty.max_percent })}
          </p>

          {!available ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              {!loyalty.enabled ? t("disabled") : loyalty.balance < loyalty.min_coins ? t("belowMinimum", { min: formatSom(loyalty.min_coins) }) : t("unavailable")}
            </p>
          ) : (
            on && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-ink-muted">{t("using")}</span>
                  <span className="text-lg font-extrabold text-ink tabular-nums">
                    −{formatSom(value)} <span className="text-xs font-medium text-ink-soft">{t("som")}</span>
                  </span>
                </div>
                {max > min && (
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
                    aria-label={t("using")}
                    className="nz-range mt-2 w-full"
                    style={{ "--fill": `${fill}%`, "--accent": "#e0a91b" } as React.CSSProperties}
                  />
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft tabular-nums">
                  <span>{formatSom(min)}</span>
                  <button type="button" onClick={() => onChange(max)} className="font-semibold text-amber-600 hover:underline dark:text-amber-400">
                    {t("useMax", { max: formatSom(max) })}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
