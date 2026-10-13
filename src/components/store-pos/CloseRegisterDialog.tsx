"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Printer, X } from "lucide-react";
import { dateTime, duration, money, pos } from "./api";
import type { PosConfig, PosError, PosSession } from "./types";

/** End of shift: count the drawer, see expected vs counted, close → frozen Z-report (printable). */
export default function CloseRegisterDialog({
  config,
  onClose,
  onClosed,
  explain,
}: {
  config: PosConfig;
  onClose: () => void;
  onClosed: () => void;
  explain: (e: PosError) => string;
}) {
  const t = useTranslations("storePos.session");
  const [live, setLive] = useState<PosSession | null>(null);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PosSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    pos<PosSession>("session").then((res) => {
      if (!cancelled && res.ok && res.data) {
        setLive(res.data);
        setCounted(String(Math.round(Number(res.data.expected_cash))));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const expected = Number(live?.expected_cash ?? 0);
  const diff = (Number(counted) || 0) - expected;

  async function close(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await pos<PosSession>("session/close", { method: "POST", body: { counted_cash: Number(counted) || 0, note } });
    setBusy(false);
    if (res.ok) setReport(res.data);
    else setError(explain(res.error));
  }

  const z = report ?? live;

  // rendered on <body>: glass (backdrop-filter) ancestors would otherwise trap this fixed overlay inside their card
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="close-title" onClick={report ? onClosed : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="nz-glass-strong animate-nz-sheet-up max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 id="close-title" className="flex items-center gap-2 text-lg font-bold text-ink">
            <Lock className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
            {report ? t("zTitle") : t("closeTitle")}
          </h2>
          <button type="button" onClick={report ? onClosed : onClose} className="rounded-xl p-2 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t("cancel")}>
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {!z ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" strokeWidth={2} />
          </div>
        ) : (
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1fr]">
            {/* Z report */}
            <div className="nz-receipt rounded-2xl bg-white p-5 font-mono text-[12px] leading-relaxed text-neutral-900">
              <p className="text-center text-sm font-bold uppercase">{config.store.name}</p>
              <p className="text-center text-[11px] font-bold tracking-[0.3em] text-neutral-500">{report ? "Z-REPORT" : "X-REPORT"}</p>
              <div className="my-2 border-t border-dashed border-neutral-400" />
              {[
                [t("opened"), `${dateTime(z.opened_at)} · ${z.opened_by}`],
                [t("closed"), z.closed_at ? `${dateTime(z.closed_at)} · ${z.closed_by ?? ""}` : "—"],
                [t("duration"), duration(z.duration_minutes)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span>{k}</span>
                  <span className="text-right">{v}</span>
                </div>
              ))}
              <div className="my-2 border-t border-dashed border-neutral-400" />
              {[
                [t("sales"), String(z.sales_count)],
                [t("items"), String(z.items_sold)],
                [t("gross"), money(z.gross_sales)],
                ...(Number(z.discounts_total) > 0 ? [[t("discounts"), `−${money(z.discounts_total)}`]] : []),
                [t("coins"), `−${money(z.coins_redeemed)}`],
                [t("cashSales"), money(z.cash_sales)],
                [t("uzcardSales"), money(z.uzcard_sales)],
                [t("humoSales"), money(z.humo_sales)],
                [t("refunds"), z.refunds_count ? `${z.refunds_count} · −${money(z.refunds_total)}` : "0"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div className="my-2 border-t border-dashed border-neutral-400" />
              {Number(z.opening_cash) > 0 && (
                <div className="flex justify-between">
                  <span>{t("float")}</span>
                  <span>{money(z.opening_cash)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>{t("expected")}</span>
                <span>{money(z.expected_cash)}</span>
              </div>
              {report && (
                <>
                  <div className="flex justify-between font-bold">
                    <span>{t("counted")}</span>
                    <span>{money(report.counted_cash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>{t("difference")}</span>
                    <span>{Number(report.cash_difference) > 0 ? "+" : ""}{money(report.cash_difference)}</span>
                  </div>
                </>
              )}
            </div>

            {report ? (
              <div className="flex flex-col justify-center gap-3 text-center">
                <p className="text-sm text-ink-muted">{t("closedDone")}</p>
                <p className={`text-2xl font-extrabold tabular-nums ${Number(report.cash_difference) === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Number(report.cash_difference) === 0 ? t("balanced") : `${Number(report.cash_difference) > 0 ? t("surplus") : t("shortage")}: ${money(Math.abs(Number(report.cash_difference)))}`}
                </p>
                <button type="button" onClick={() => window.print()} className="nz-liquid-chip inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
                  <Printer className="h-4 w-4" strokeWidth={2} />
                  {t("print")}
                </button>
                <button type="button" onClick={onClosed} className="nz-cta rounded-2xl py-3 text-sm font-bold">
                  {t("done")}
                </button>
              </div>
            ) : (
              <form onSubmit={close} className="flex flex-col">
                <label htmlFor="counted" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  {t("countedLabel")}
                </label>
                <input
                  id="counted"
                  autoFocus
                  inputMode="numeric"
                  value={money(counted)}
                  onChange={(e) => setCounted(e.target.value.replace(/[^\d]/g, "") || "0")}
                  onFocus={(e) => e.target.select()}
                  className="nz-glass-input mt-2 w-full rounded-2xl px-4 py-3.5 text-right text-2xl font-extrabold tabular-nums"
                />
                <div className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-3 ${Math.round(diff) === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600"}`}>
                  <span className="text-sm font-semibold">{Math.round(diff) === 0 ? t("balanced") : diff > 0 ? t("surplus") : t("shortage")}</span>
                  <span className="text-xl font-extrabold tabular-nums">{money(Math.abs(diff))}</span>
                </div>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder={t("notePlaceholder")} className="nz-glass-input mt-3 w-full rounded-xl px-3.5 py-2.5 text-sm" />
                {error && (
                  <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 py-4 text-base font-bold text-white shadow-lg shadow-red-500/25 disabled:opacity-60">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Lock className="h-5 w-5" strokeWidth={2} />}
                  {t("closeButton")}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
