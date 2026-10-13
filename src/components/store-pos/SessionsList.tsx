"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock3, LockOpen, Lock } from "lucide-react";
import { dateTime, duration, money, pos } from "./api";
import type { PosSession } from "./types";

/** Every cash-register shift of this store: open/close times, who ran it, the Z-report totals and the drawer difference. */
export default function SessionsList() {
  const t = useTranslations("storePos.session");
  const [rows, setRows] = useState<PosSession[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    pos<{ results: PosSession[] }>("sessions").then((res) => {
      if (!cancelled && res.ok) setRows(res.data.results);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows) return <div className="nz-liquid h-64 animate-pulse rounded-3xl" aria-hidden="true" />;
  if (rows.length === 0) return <p className="nz-liquid rounded-3xl px-6 py-14 text-center text-sm text-ink-muted">{t("none")}</p>;

  return (
    <div className="nz-liquid overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            <th className="px-5 py-3">{t("colStatus")}</th>
            <th className="px-3 py-3">{t("opened")}</th>
            <th className="px-3 py-3">{t("closed")}</th>
            <th className="px-3 py-3">{t("duration")}</th>
            <th className="px-3 py-3 text-right">{t("sales")}</th>
            <th className="px-3 py-3 text-right">{t("gross")}</th>
            <th className="px-3 py-3 text-right">{t("cashSales")}</th>
            <th className="px-3 py-3 text-right">{t("cards")}</th>
            <th className="px-3 py-3 text-right">{t("coins")}</th>
            <th className="px-3 py-3 text-right">{t("expected")}</th>
            <th className="px-3 py-3 text-right">{t("counted")}</th>
            <th className="px-5 py-3 text-right">{t("difference")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((s) => {
            const diff = s.cash_difference === null ? null : Number(s.cash_difference);
            return (
              <tr key={s.id} className="hover:bg-surface-2/30">
                <td className="px-5 py-3">
                  {s.status === "open" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                      <LockOpen className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      {t("statusOpen")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-bold text-ink-muted">
                      <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      {t("statusClosed")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink tabular-nums">{dateTime(s.opened_at)}</p>
                  <p className="text-[11px] text-ink-soft">{s.opened_by}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink tabular-nums">{s.closed_at ? dateTime(s.closed_at) : "—"}</p>
                  {s.closed_by && <p className="text-[11px] text-ink-soft">{s.closed_by}</p>}
                </td>
                <td className="px-3 py-3 text-ink-muted tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    {duration(s.duration_minutes)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{s.sales_count}</td>
                <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">{money(s.gross_sales)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{money(s.cash_sales)}</td>
                <td className="px-3 py-3 text-right tabular-nums" title={`Uzcard ${money(s.uzcard_sales)} · Humo ${money(s.humo_sales)}`}>
                  {money(Number(s.uzcard_sales) + Number(s.humo_sales))}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{money(s.coins_redeemed)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{money(s.expected_cash)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{s.counted_cash ? money(s.counted_cash) : "—"}</td>
                <td className={`px-5 py-3 text-right font-bold tabular-nums ${diff === null ? "text-ink-soft" : diff === 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-amber-600"}`}>
                  {diff === null ? "—" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${money(Math.abs(diff))}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
