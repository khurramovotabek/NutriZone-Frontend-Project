"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Target, Wallet } from "lucide-react";
import { money } from "./api";
import type { PosEarnings } from "./types";

/**
 * A cashier's own pay this month: fixed base + KPI (a % of their net sales). `compact` is the chip in the shift
 * bar (opens the breakdown); otherwise the full card on the start-of-shift screen.
 */
export default function EarningsCard({ e, compact = false }: { e: PosEarnings; compact?: boolean }) {
  const t = useTranslations("storePos.earnings");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => !ref.current?.contains(ev.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const body = (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("thisMonth")}</span>
        {e.paid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            {t("paid")}
          </span>
        ) : null}
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">
        {money(e.paid ?? e.total)} <span className="text-sm font-semibold text-ink-soft">{t("som")}</span>
      </p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-surface-2/60 p-2.5">
          <dt className="text-ink-soft">{t("base")}</dt>
          <dd className="mt-0.5 font-bold text-ink tabular-nums">{money(e.base_salary)}</dd>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-2.5">
          <dt className="text-amber-700 dark:text-amber-400">KPI · {e.kpi_percent}%</dt>
          <dd className="mt-0.5 font-bold text-amber-700 tabular-nums dark:text-amber-300">+{money(e.kpi)}</dd>
        </div>
      </dl>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Target className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
        {t("sales", { count: e.sales, amount: money(e.revenue) })}
      </p>
      <p className="text-[11px] leading-relaxed text-ink-soft">{t("hint", { percent: e.kpi_percent })}</p>
    </div>
  );

  if (!compact) return <div className="nz-glass rounded-2xl p-4">{body}</div>;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300" title={t("thisMonth")}>
        <Wallet className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="tabular-nums">{money(e.paid ?? e.total)}</span>
      </button>
      {open && <div className="nz-glass-strong animate-nz-sheet-up absolute right-0 top-full z-[60] mt-2 w-72 rounded-2xl p-4 shadow-2xl">{body}</div>}
    </div>
  );
}
