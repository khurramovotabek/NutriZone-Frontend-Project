"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, Rocket } from "lucide-react";
import type { LoyaltyRate } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { coinsFor, formatPercent, formatSom } from "@/components/loyalty/format";

// One request per page view, shared by every instance (variant switches re-render, they don't refetch).
let ratePromise: Promise<LoyaltyRate | null> | null = null;
function loadRate(): Promise<LoyaltyRate | null> {
  ratePromise ??= fetch("/api/loyalty/rate")
    .then((r) => r.json())
    .then((body) => (body?.success ? (body.data as LoyaltyRate) : null))
    .catch(() => null)
    .finally(() => setTimeout(() => (ratePromise = null), 60_000));
  return ratePromise;
}

/**
 * "+N coins for this purchase" in the buy box: the selected variant's price
 * at the shopper's own tier (the tier before this order is what earns, so
 * it is exact), plus the nudge that matters -- "this purchase lifts you to
 * Gold" or how far the next level is. Guests see the entry rate and a
 * sign-in link. So'm prices only (coins are defined against UZS); anything
 * else renders `fallback` (the generic "earn coins" line).
 */
export default function ProductCoinReward({ price, currency, fallback = null }: { price: string | number | null | undefined; currency: string | null | undefined; fallback?: ReactNode }) {
  const t = useTranslations("product.coinsReward");
  const pathname = usePathname();
  const [rate, setRate] = useState<LoyaltyRate | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadRate().then((r) => {
      if (!cancelled) setRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const amount = Number(price);
  if (currency !== "UZS" || !Number.isFinite(amount) || amount <= 0 || rate === null) return fallback;

  if (rate === undefined) {
    return (
      <li aria-hidden="true" className="flex items-center gap-2.5">
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-3/70" />
        <span className="flex-1 space-y-1.5">
          <span className="block h-3 w-2/5 animate-pulse rounded bg-surface-3/70" />
          <span className="block h-2.5 w-3/5 animate-pulse rounded bg-surface-3/50" />
        </span>
      </li>
    );
  }

  const tier = rate.current_tier;
  const coins = tier ? coinsFor(amount, tier.percent) : 0;
  if (!tier || coins <= 0) return fallback;
  const next = rate.next_tier;
  const toNext = rate.amount_to_next !== null ? Number(rate.amount_to_next) : null;
  const upgrades = rate.logged_in && next && toNext !== null && amount >= toNext;

  return (
    <li className="nz-coin-reward -mx-3 px-3">
      <Link href={rate.logged_in ? "/account/loyalty" : "/loyalty"} className="group flex items-center gap-2.5">
        <CoinIcon size={32} className="nz-coin-float shrink-0 drop-shadow-[0_4px_8px_rgba(180,120,10,0.35)]" />
        <span className="min-w-0 flex-1">
          <span className="nz-gradient-gold block text-[13px] font-extrabold tabular-nums">{t("earn", { coins: formatSom(coins) })}</span>
          <span className="mt-0.5 flex items-center gap-1 leading-snug text-ink-muted">
            {rate.logged_in ? (
              <>
                <TierBadge icon={tier.icon} color={tier.color} size={14} className="shrink-0" />
                {t("tier", { tier: tier.name, percent: formatPercent(tier.percent) })}
              </>
            ) : (
              t("guest", { percent: formatPercent(tier.percent) })
            )}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
      </Link>
      {upgrades ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1.5 font-semibold text-success">
          <Rocket className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {t("upgrade", { tier: next.name, percent: formatPercent(next.percent) })}
        </p>
      ) : (
        rate.logged_in &&
        next &&
        toNext !== null && (
          <p className="mt-1.5 flex items-center gap-1.5 pl-[42px] text-[11px] text-ink-soft tabular-nums">
            <TierBadge icon={next.icon} color={next.color} size={12} className="shrink-0" />
            {t("toNext", { tier: next.name, amount: formatSom(toNext) })}
          </p>
        )
      )}
      {!rate.logged_in && (
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="mt-1.5 inline-flex pl-[42px] text-[11px] font-semibold text-primary hover:underline">
          {t("guestCta")}
        </Link>
      )}
    </li>
  );
}

/**
 * Cart / checkout summary row: "+N coins for this order" at the shopper's
 * tier. `amount` is what they actually pay in so'm (coins paid at checkout
 * earn nothing), so the figure matches what the wallet will receive.
 */
export function OrderCoinEarn({ amount, currency }: { amount: number; currency: string | null | undefined }) {
  const t = useTranslations("product.coinsReward");
  const [rate, setRate] = useState<LoyaltyRate | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadRate().then((r) => {
      if (!cancelled) setRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tier = rate?.current_tier;
  const coins = tier && currency === "UZS" ? coinsFor(amount, tier.percent) : 0;
  if (!rate || !tier || coins <= 0) return null;
  return (
    <p className="nz-coin-reward mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
      <CoinIcon size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="nz-gradient-gold block font-extrabold tabular-nums">{t("orderEarn", { coins: formatSom(coins) })}</span>
        <span className="block text-[11px] text-ink-muted">{rate.logged_in ? t("tier", { tier: tier.name, percent: formatPercent(tier.percent) }) : t("guest", { percent: formatPercent(tier.percent) })}</span>
      </span>
    </p>
  );
}
