"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift, PackageSearch, Send, X } from "lucide-react";
import CoinIcon from "@/components/loyalty/CoinIcon";

const DISMISS_KEY = "nz_signup_nudge_dismissed_at";
const VIEWS_KEY = "nz_signup_nudge_views";
const DISMISS_DAYS = 3;
const VIEWS_BEFORE_NUDGE = 2;
const SECONDS_BEFORE_NUDGE = 40;
// Pages where a sign-in card would get in the way (the customer is already on a sign-in or paying path).
const QUIET_PATHS = ["/checkout", "/cart", "/login", "/account", "/profile", "/orders"];

function read(key: string, storage: "local" | "session"): string | null {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string, storage: "local" | "session") {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* private mode: the nudge simply shows again next visit */
  }
}

/**
 * Guests only (the layout renders it without a session): many visitors browse products and never register because
 * signing in looked unclear. After a couple of product pages (or ~40 s on the site) a small card explains what an
 * account gives and that it is one Telegram tap. Dismissed for 3 days; never inside the Telegram Mini App (already
 * signed in there) or on checkout/cart/account pages.
 */
export default function SignupNudge() {
  const t = useTranslations("signupNudge");
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(read(DISMISS_KEY, "local") || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;
    if (typeof window !== "undefined" && (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData) return;
    if (QUIET_PATHS.some((p) => pathname.startsWith(p))) return;
    let views = 0;
    if (pathname.startsWith("/products/")) {
      views = Number(read(VIEWS_KEY, "session") || 0) + 1;
      write(VIEWS_KEY, String(views), "session");
    }
    // a short beat after the second product page (let it render first), otherwise ~40 s into the visit
    const timer = setTimeout(() => setOpen(true), views >= VIEWS_BEFORE_NUDGE ? 1500 : SECONDS_BEFORE_NUDGE * 1000);
    return () => clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    write(DISMISS_KEY, String(Date.now()), "local");
    setOpen(false);
  }

  if (!open || QUIET_PATHS.some((p) => pathname.startsWith(p))) return null;

  const perks = [
    { icon: <CoinIcon size={18} />, text: t("perkCoins") },
    { icon: <PackageSearch className="h-4 w-4 text-sky-400" strokeWidth={2} aria-hidden="true" />, text: t("perkOrders") },
    { icon: <Gift className="h-4 w-4 text-rose-400" strokeWidth={2} aria-hidden="true" />, text: t("perkDeals") },
  ];

  return (
    <div
      role="dialog"
      aria-labelledby="signup-nudge-title"
      className="fixed inset-x-3 z-40 border border-ink/10 bg-surface/95 backdrop-blur-xl mx-auto max-w-md animate-[nz-sheet-up_.35s_ease-out] rounded-3xl p-4 shadow-2xl shadow-black/30 sm:inset-x-auto sm:left-6 sm:p-5"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      <button type="button" onClick={dismiss} aria-label={t("close")} className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </button>
      <p id="signup-nudge-title" className="pr-8 text-base font-extrabold tracking-tight text-ink">
        {t("title")}
      </p>
      <p className="mt-1 pr-6 text-[13px] leading-relaxed text-ink-muted">{t("subtitle")}</p>
      {/* phones: the perks stay off -- the card must not cover half the product page; the title and one tap say enough */}
      <ul className="mt-3 hidden space-y-1.5 sm:block">
        {perks.map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
            {text}
          </li>
        ))}
      </ul>
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        onClick={() => write(DISMISS_KEY, String(Date.now()), "local")}
        className="nz-telegram-btn mt-3 flex w-full sm:mt-4 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white sm:py-3.5"
      >
        <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        {t("cta")}
      </Link>
      <button type="button" onClick={dismiss} className="mt-1 w-full py-1.5 text-center sm:mt-2 text-xs font-semibold text-ink-soft hover:text-ink">
        {t("later")}
      </button>
    </div>
  );
}
