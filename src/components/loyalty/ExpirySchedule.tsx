"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, ShieldCheck } from "lucide-react";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { formatSom } from "@/components/loyalty/format";
import { formatDate } from "@/lib/dates";

/** "What burns when": the next expiry dates of the customer's coin lots as a timeline, each bar sized against the current balance. */
export default function ExpirySchedule({ schedule, balance, now }: { schedule: LoyaltySummary["expiry_schedule"]; balance: number; now: number }) {
  const t = useTranslations("loyalty.account");
  const locale = useLocale();

  return (
    <section className="nz-liquid flex h-full flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="expiry-title">
      <h2 id="expiry-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
        <CalendarClock className="h-5 w-5 text-amber-500" strokeWidth={1.75} aria-hidden="true" />
        {t("expiryTitle")}
      </h2>
      <p className="mt-0.5 text-sm text-ink-muted">{t("expirySubtitle")}</p>

      {schedule.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
          <ShieldCheck className="h-8 w-8 text-success" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-2 text-sm text-ink-muted">{t("expiryNone")}</p>
        </div>
      ) : (
        <ol className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-gradient-to-b before:from-amber-500/60 before:to-transparent">
          {schedule.map((row, i) => {
            const days = Math.max(0, Math.ceil((new Date(row.date).getTime() - now) / 86_400_000));
            const share = balance > 0 ? Math.max(4, Math.min(100, (row.coins / balance) * 100)) : 0;
            const urgent = days <= 14;
            return (
              <li key={row.date} className="relative pl-7">
                <span aria-hidden="true" className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 ${i === 0 ? "border-amber-500 bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]" : "border-amber-500/50 bg-surface"}`} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{formatDate(row.date, locale, "long")}</p>
                  <p className="flex items-center gap-1 text-sm font-extrabold text-ink tabular-nums">
                    {formatSom(row.coins)}
                    <CoinIcon size={14} />
                  </p>
                </div>
                <p className={`text-[11px] font-medium ${urgent ? "text-amber-600 dark:text-amber-400" : "text-ink-soft"}`}>{t("expiryIn", { days })}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3/60">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
