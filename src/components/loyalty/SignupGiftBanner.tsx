"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import CoinIcon from "@/components/loyalty/CoinIcon";

export interface Campaign {
  enabled: boolean;
  open: boolean;
  coins: number;
  limit: number;
  granted: number;
  remaining: number | null;
  max_redeem_percent: number;
  mine: { number: number; coins: number } | null;
}

const nf = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");

/**
 * Opening gift: "the first 500 buyers get 5 000 coins" (paid when the first order is confirmed), with the live number
 * of slots left.
 * - everyone without a slot while it's open: the offer + a "start shopping" button;
 * - shoppers who got it: a thank-you line with their slot number (home only);
 * - nothing at all once the campaign is closed or off.
 */
export default function SignupGiftBanner({ variant = "home", className = "", initial }: { variant?: "home" | "compact"; className?: string; initial?: Campaign | null }) {
  const t = useTranslations("signupGift");
  // `initial` = fetched on the server (home page): the banner is in the first HTML, so nothing below it jumps down
  // when it would otherwise appear after hydration (it was the page's whole layout shift, CLS 0.135).
  const [c, setC] = useState<Campaign | null>(initial ?? null);

  useEffect(() => {
    if (initial !== undefined) return;
    let alive = true;
    fetch("/api/loyalty/signup-bonus")
      .then((r) => r.json())
      .then((b) => {
        if (alive && b?.success) setC(b.data as Campaign);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initial]);

  if (!c) return null;

  if (c.mine) {
    if (variant === "compact") return null;
    return (
      <section className={`relative overflow-hidden rounded-3xl border border-amber-400/30 bg-[linear-gradient(120deg,rgba(251,191,36,0.16),rgba(16,185,129,0.10))] p-4 sm:p-5 ${className}`}>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <CoinIcon size={44} className="nz-coin-float shrink-0" />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="block font-extrabold">{t("mineTitle", { coins: nf(c.mine.coins), number: c.mine.number })}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{t("mineText", { percent: c.max_redeem_percent })}</span>
          </p>
          <Link href="/account/loyalty" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-semibold text-surface transition-transform hover:-translate-y-0.5">
            {t("mineCta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  if (!c.open) return null;
  const limited = c.limit > 0 && c.remaining !== null;
  const takenPct = limited ? Math.min(100, Math.max(4, Math.round((c.granted / c.limit) * 100))) : 0;
  const progress = limited ? (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-amber-200">{t("left", { count: nf(c.remaining ?? 0) })}</span>
        <span className="text-white/60 tabular-nums">
          {nf(c.granted)} / {nf(c.limit)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={c.limit} aria-valuenow={c.granted} aria-label={t("progressLabel")}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400" style={{ width: `${takenPct}%` }} />
      </div>
    </div>
  ) : null;

  if (variant === "compact") {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1c1407,#3b2506_55%,#0f172a)] p-4 text-white shadow-lg ${className}`}>
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/30 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <CoinIcon size={40} className="nz-coin-float shrink-0" />
          <p className="min-w-0 text-sm">
            <span className="block font-extrabold">{t("compactTitle", { coins: nf(c.coins) })}</span>
            <span className="mt-0.5 block text-xs text-white/75">{limited ? t("compactText", { limit: nf(c.limit) }) : t("compactTextUnlimited")}</span>
          </p>
        </div>
        <div className="relative">{progress}</div>
      </div>
    );
  }

  return (
    <section className={`relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1c1407_0%,#3b2506_50%,#0f172a_100%)] p-5 text-white shadow-2xl shadow-amber-900/20 sm:p-8 ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/30 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-7">
        <div className="flex items-center gap-3 md:block">
          <CoinIcon size={72} className="nz-coin-float shrink-0" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200 md:hidden">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("eyebrow")}
          </span>
        </div>
        <div className="min-w-0">
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200 md:inline-flex">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("eyebrow")}
          </span>
          <h2 className="mt-2 text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {limited ? t("title", { limit: nf(c.limit), coins: nf(c.coins) }) : t("titleUnlimited", { coins: nf(c.coins) })}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">{t("text", { percent: c.max_redeem_percent })}</p>
          <div className="max-w-md">{progress}</div>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 text-sm font-extrabold text-[#1c1407] shadow-lg shadow-amber-900/30 transition-transform hover:-translate-y-0.5 md:w-auto"
        >
          <Gift className="h-4 w-4" aria-hidden="true" />
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
