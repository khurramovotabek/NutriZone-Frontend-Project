"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Gift, Link2, Loader2, Send, Share2, UserPlus, Users } from "lucide-react";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { formatSom } from "@/components/loyalty/format";
import { useBrand } from "@/components/BrandContext";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
const ERROR_CODES = new Set(["REFERRAL_CODE_INVALID", "REFERRAL_SELF", "REFERRAL_NOT_ELIGIBLE", "REFERRAL_CYCLE", "REFERRAL_DISABLED"]);

/**
 * Invite-a-friend: personal code + web and Telegram links, one-tap sharing,
 * live stats and the invited friends list; plus "have a code?" for a new
 * customer who arrived without the link. Rewards are paid by the backend when
 * the friend's first order is delivered.
 */
export default function ReferralCard({ referral, programme, onClaimed }: { referral: LoyaltySummary["referral"]; programme: LoyaltySummary["programme"]; onClaimed: () => void }) {
  const brand = useBrand();
  const t = useTranslations("loyalty.referral");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const webLink = typeof window === "undefined" ? "" : `${window.location.origin}/?ref=${referral.code}`;
  const botLink = BOT ? `https://t.me/${BOT}?start=ref_${referral.code}` : null;
  const shareText = t("shareText", { coins: formatSom(programme.referee_reward) });

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard blocked -- the value stays visible and selectable.
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: brand.name, text: shareText, url: webLink }).catch(() => {});
    } else {
      copy(webLink, "link");
    }
  }

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || state === "busy") return;
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/loyalty/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setError(ERROR_CODES.has(body?.error?.code) ? t(`errors.${body.error.code}`) : t("errors.generic"));
        setState("error");
        return;
      }
      setState("done");
      onClaimed();
    } catch {
      setError(t("errors.generic"));
      setState("error");
    }
  }

  if (!programme.referral_enabled) return null;

  return (
    <section aria-labelledby="referral-title" className="nz-liquid relative overflow-hidden rounded-3xl">
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Gift className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 id="referral-title" className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("subtitle", { referrer: formatSom(programme.referrer_reward), referee: formatSom(programme.referee_reward) })}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { who: t("you"), coins: programme.referrer_reward },
              { who: t("friend"), coins: programme.referee_reward },
            ].map(({ who, coins }) => (
              <div key={who} className="rounded-2xl border border-border/60 bg-surface-2/40 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{who}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xl font-extrabold text-ink tabular-nums">
                  <CoinIcon size={22} />+{formatSom(coins)}
                </p>
              </div>
            ))}
          </div>

          <ol className="mt-5 space-y-2 text-sm text-ink-muted">
            {(["share", "join", "order"] as const).map((step, i) => (
              <li key={step} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{i + 1}</span>
                {t(`steps.${step}`)}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/[0.06] p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{t("yourCode")}</p>
            <p className="mt-1 font-mono text-3xl font-black tracking-[0.18em] text-ink">{referral.code}</p>
            <button type="button" onClick={() => copy(referral.code, "code")} className="nz-liquid-chip mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold">
              {copied === "code" ? <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
              {copied === "code" ? t("copied") : t("copyCode")}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-2/40 p-2 pl-3.5">
            <Link2 className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{webLink}</span>
            <button type="button" onClick={() => copy(webLink, "link")} className="nz-cta shrink-0 rounded-xl px-3 py-2 text-xs font-semibold">
              {copied === "link" ? t("copied") : t("copyLink")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(botLink ?? webLink)}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-transform hover:-translate-y-0.5"
            >
              <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Telegram
            </a>
            <button type="button" onClick={nativeShare} className="nz-liquid-chip inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold">
              <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("share")}
            </button>
          </div>

          <dl className="grid grid-cols-3 gap-2 pt-1 text-center">
            {[
              { label: t("statInvited"), value: referral.invited_count },
              { label: t("statRewarded"), value: referral.rewarded_count },
              { label: t("statEarned"), value: formatSom(referral.earned_coins), coin: true },
            ].map(({ label, value, coin }) => (
              <div key={label} className="rounded-xl bg-surface-2/40 p-2.5">
                <dd className="flex items-center justify-center gap-1 text-lg font-extrabold text-ink tabular-nums">
                  {coin && <CoinIcon size={16} />}
                  {value}
                </dd>
                <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {(referral.friends.length > 0 || referral.can_enter_code || referral.referred_by) && (
        <div className="relative grid gap-4 border-t border-border/50 p-5 sm:p-7 lg:grid-cols-2">
          {referral.friends.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {t("friends")}
              </p>
              <ul className="space-y-1.5">
                {referral.friends.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/40 px-3 py-2 text-sm">
                    <span className="truncate font-medium text-ink">{f.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.status === "rewarded" ? "bg-success/12 text-success" : "bg-amber-500/12 text-amber-600 dark:text-amber-400"}`}>
                      {t(`status.${f.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {referral.referred_by ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} aria-hidden="true" />
              <p className="text-sm text-ink">
                {referral.referred_status === "rewarded" ? t("referredRewarded", { name: referral.referred_by }) : t("referredPending", { name: referral.referred_by, coins: formatSom(programme.referee_reward) })}
              </p>
            </div>
          ) : (
            referral.can_enter_code &&
            state !== "done" && (
              <form onSubmit={claim}>
                <label htmlFor="ref-code" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t("haveCode")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="ref-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={16}
                    placeholder="NZ······"
                    autoComplete="off"
                    className="nz-glass-input min-w-0 flex-1 rounded-xl px-3.5 py-2.5 font-mono text-sm uppercase tracking-widest"
                  />
                  <button type="submit" disabled={state === "busy" || !code.trim()} className="nz-cta inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60">
                    {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                    {t("apply")}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-ink-soft">{t("haveCodeHint", { coins: formatSom(programme.referee_reward) })}</p>
                {error && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </form>
            )
          )}
        </div>
      )}
    </section>
  );
}
