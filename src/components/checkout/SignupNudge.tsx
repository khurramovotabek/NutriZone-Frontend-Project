"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Gift, MapPinCheck, PackageCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import CoinIcon from "@/components/loyalty/CoinIcon";

interface Campaign {
  open: boolean;
  coins: number;
  limit: number;
  remaining: number | null;
  mine: unknown;
}

const nf = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");
const DISMISS_KEY = "nz-signup-nudge-dismissed";

/**
 * "Sign up" recommended, never forced: guests see what an account gives (the opening gift while it is open, coins
 * cashback, order tracking, a saved address), one button to the one-tap Telegram sign-in and a way to just carry on.
 * Dismissed -> a slim one-line reminder for the rest of the session.
 * - checkout: above the form (dismissible);
 * - success: after a guest order -- the strongest moment to ask, the order is already safe.
 */
export default function SignupNudge({ href, variant = "checkout", className = "" }: { href: string; variant?: "checkout" | "success"; className?: string }) {
  const t = useTranslations("checkout.signup");
  const [gift, setGift] = useState<Campaign | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (variant === "checkout") {
      try {
        if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only storage
      } catch {
        /* storage blocked: show the card */
      }
    }
    let alive = true;
    fetch("/api/loyalty/signup-bonus")
      .then((r) => r.json())
      .then((b) => alive && b?.success && setGift(b.data as Campaign))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [variant]);

  const giftOpen = !!gift?.open && !gift.mine && gift.coins > 0;
  const slotsLeft = giftOpen && gift!.limit > 0 && gift!.remaining != null ? gift!.remaining : null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* fine for this page */
    }
  }

  if (dismissed) {
    return (
      <div className={`flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-2.5 ${className}`}>
        <Gift className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{giftOpen ? t("slimGift", { coins: nf(gift!.coins) }) : t("slim")}</p>
        <Link href={href} className="shrink-0 text-[13px] font-bold text-primary">{t("slimCta")}</Link>
      </div>
    );
  }

  const benefits = [
    { icon: Coins, text: t("benefitCashback"), chip: t("chipCashback") },
    { icon: PackageCheck, text: t("benefitTrack"), chip: t("chipTrack") },
    { icon: MapPinCheck, text: t("benefitFaster"), chip: t("chipFaster") },
  ];
  const title = giftOpen ? t("titleGift", { coins: nf(gift!.coins) }) : variant === "success" ? t("titleSuccess") : t("title");
  const subtitle = giftOpen ? t("subtitleGift") : t("subtitle");
  const shell = "relative overflow-hidden border border-amber-400/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(16,185,129,0.07)_60%,transparent)]";
  const glow = <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />;
  const slots = slotsLeft != null && (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
      <Gift className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {t("slots", { count: nf(slotsLeft) })}
    </span>
  );
  const cta = (extra: string) => (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-ink px-4 text-sm font-bold text-surface shadow-[0_10px_24px_-12px_rgba(15,23,42,0.6)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] ${extra}`}
    >
      {t("cta")}
      <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );

  // checkout: compact -- the form stays on the first screen; benefits as three short chips, both choices in one row
  if (variant === "checkout") {
    return (
      <section aria-labelledby="nz-signup-nudge-title" className={`${shell} rounded-2xl p-3.5 sm:p-4 ${className}`}>
        {glow}
        <button type="button" onClick={dismiss} aria-label={t("dismiss")} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="relative flex items-center gap-3 pr-7">
          <CoinIcon size={36} className="nz-coin-float shrink-0" />
          <div className="min-w-0">
            <h2 id="nz-signup-nudge-title" className="text-[14px] font-extrabold leading-snug text-ink">{title}</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">{subtitle}</p>
          </div>
        </div>
        <ul className="relative mt-2.5 flex flex-wrap gap-1.5">
          {benefits.map(({ icon: Icon, text, chip }) => (
            <li key={chip} title={text} className="inline-flex items-center gap-1 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm">
              <Icon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
              {chip}
            </li>
          ))}
          {slots && <li>{slots}</li>}
        </ul>
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          {cta("grow")}
          <button type="button" onClick={dismiss} className="min-h-11 grow whitespace-nowrap rounded-xl border border-border bg-surface/70 px-3 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink">
            {t("continueGuestShort")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="nz-signup-nudge-title" className={`${shell} rounded-3xl p-4 sm:p-5 ${className}`}>
      {glow}
      <div className="relative flex items-start gap-3">
        <CoinIcon size={42} className="nz-coin-float shrink-0" />
        <div className="min-w-0">
          <h2 id="nz-signup-nudge-title" className="text-[15px] font-extrabold leading-snug text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
        </div>
      </div>

      <ul className="relative mt-3.5 space-y-2">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-[13px] text-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface/80 text-emerald-600 shadow-sm dark:text-emerald-400">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>

      {slots && <div className="relative mt-3">{slots}</div>}

      <div className="relative mt-4 flex flex-col gap-2">
        {cta("w-full")}
        <p className="text-center text-[11px] text-ink-soft">{t("ctaHint")}</p>
      </div>
    </section>
  );
}
