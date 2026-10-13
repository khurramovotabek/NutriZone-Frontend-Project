"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Package, Receipt as ReceiptIcon, RotateCcw, Search, Undo2, UserRound } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { dayKey, money, pos, timeOnly } from "./api";
import type { PosError, PosHistoryRow, PosSale } from "./types";
import ReceiptDialog from "./ReceiptDialog";
import RefundDialog from "./RefundDialog";

type Period = "today" | "7d" | "30d";

// Browsers' "uz" date data is incomplete (renders "M09 27, Sun"), so Uzbek day labels are spelled out here.
const UZ_WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

function dayLabel(d: Date, locale: string): string {
  if (locale === "uz") return `${UZ_WEEKDAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
  return d.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
}
type History = { results: PosHistoryRow[]; total_count: number; page: number };

/**
 * Sales history: grouped by day (with each day's total), every sale showing its
 * time, buyer, how it was paid (cash + coins) and -- expanded -- exactly what
 * was bought. Receipts can be reprinted; a completed sale can be returned
 * (vozvrat) inside the open shift.
 */
export default function SalesHistory({ explain }: { explain: (e: PosError) => string }) {
  const t = useTranslations("storePos");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<Period>(searchParams.get("q") ? "30d" : "today");
  const [status, setStatus] = useState<"all" | "completed" | "partial" | "refunded">("all");
  // A scanned receipt QR lands here as ?q=<token> -- that one sale, whatever its date.
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [data, setData] = useState<History | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [receipt, setReceipt] = useState<PosSale | null>(null);
  const [refunding, setRefunding] = useState<PosSale | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ period, page: String(page) });
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      return pos<History>(`sales?${params}`);
    },
    [period, status, q],
  );

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      query(1).then((res) => {
        if (!cancelled && res.ok) setData(res.data);
      });
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, q, reload]);

  async function more() {
    if (!data) return;
    setLoadingMore(true);
    const res = await query(data.page + 1);
    setLoadingMore(false);
    if (res.ok) setData({ ...res.data, results: [...data.results, ...res.data.results] });
  }

  async function openReceipt(id: string) {
    const res = await pos<PosSale>(`sales/${id}`);
    if (res.ok) setReceipt(res.data);
  }

  async function startRefund(id: string) {
    const res = await pos<PosSale>(`sales/${id}`);
    if (res.ok) setRefunding(res.data);
    else setMessage({ tone: "error", text: explain(res.error) });
  }

  function refundDone(updated: PosSale) {
    setRefunding(null);
    const last = updated.refunds[updated.refunds.length - 1];
    setMessage({ tone: "ok", text: t("return.done", { number: last?.number ?? updated.number, amount: money(last?.value ?? 0) }) });
    setReload((n) => n + 1);
    setReceipt(updated); // the updated receipt (with the return on it), ready to print for the customer
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups = useMemo(() => {
    const out: { key: string; label: string; total: number; count: number; rows: PosHistoryRow[] }[] = [];
    for (const r of data?.results ?? []) {
      const key = r.completed_at ? dayKey(r.completed_at) : "—";
      let g = out.find((x) => x.key === key);
      if (!g) {
        const d = r.completed_at ? new Date(r.completed_at) : null;
        g = { key, label: d ? dayLabel(d, locale) : "—", total: 0, count: 0, rows: [] };
        out.push(g);
      }
      g.rows.push(r);
      if (r.status === "completed") {
        g.total += Number(r.total) - Number(r.discount || 0);
        g.count += 1;
      }
    }
    return out;
  }, [data, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="nz-liquid inline-flex rounded-full p-1">
          {(["today", "7d", "30d"] as const).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} type="button" onClick={() => setPeriod(p)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${period === p ? "bg-primary text-primary-contrast shadow" : "text-ink-muted hover:text-ink"}`}>
              {t(`periods.${p}`)}
            </button>
          ))}
        </div>
        <div className="nz-liquid inline-flex rounded-full p-1">
          {(["all", "completed", "partial", "refunded"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${status === s ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink"}`}>
              {t(`history.status.${s}`)}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("history.search")} className="nz-glass-input w-full rounded-full py-2 pl-9 pr-3 text-sm" aria-label={t("history.search")} />
        </div>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="nz-liquid-chip rounded-full p-2" aria-label={t("refresh")} title={t("refresh")}>
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {message && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm font-medium ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600"}`}>
          {message.text}
        </p>
      )}

      {!data ? (
        <div className="nz-liquid h-64 animate-pulse rounded-3xl" aria-hidden="true" />
      ) : data.results.length === 0 ? (
        <div className="nz-liquid flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <ReceiptIcon className="h-10 w-10 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">{t("noSalesYet")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key} className="nz-liquid overflow-hidden rounded-3xl">
              <header className="flex items-center justify-between border-b border-border/60 bg-surface-2/40 px-5 py-3">
                <h3 className="text-sm font-bold capitalize text-ink">{g.label}</h3>
                <p className="text-xs text-ink-muted tabular-nums">
                  {t("itemsSales", { count: g.count })} · <b className="text-ink">{money(g.total)}</b> {t("som")}
                </p>
              </header>
              <ul className="divide-y divide-border/50">
                {g.rows.map((r) => {
                  const open = expanded.has(r.id);
                  const coins = Number(r.coins_redeemed);
                  const discount = Number(r.discount);
                  return (
                    <li key={r.id} className={r.status === "refunded" ? "bg-red-500/[0.03]" : ""}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                        <button type="button" onClick={() => toggle(r.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span className="w-12 shrink-0 font-mono text-sm font-bold text-ink tabular-nums">{timeOnly(r.completed_at)}</span>
                          <span className="flex -space-x-2">
                            {r.items.slice(0, 3).map((it, i) => (
                              <span key={i} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-surface bg-white">
                                <MediaImage src={it.image_url} alt="" fit="contain" padding="p-0.5" fallbackIcon={<Package className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.5} />} />
                              </span>
                            ))}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                              {r.number}
                              {r.status === "refunded" && <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-[10px] font-bold text-red-600">{t("statusRefunded")}</span>}
                              {r.partially_refunded && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  {t("return.partialBadge", { amount: money(r.refunded_value) })}
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 truncate text-[11px] text-ink-soft">
                              <UserRound className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                              {r.customer ?? t("history.walkIn")} · {t("itemsCount", { count: r.item_count })}
                            </span>
                          </span>
                          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <div className="text-right">
                          <p className={`text-sm font-extrabold tabular-nums ${r.status === "refunded" ? "text-ink-soft line-through" : "text-ink"}`}>{money(r.total)}</p>
                          <p className="flex items-center justify-end gap-1 text-[11px] text-ink-soft tabular-nums">
                            {(r.payments.length ? r.payments : [{ method: r.payment_method, amount: r.paid }]).map((p, i) => (
                              <span key={p.method}>
                                {i > 0 && "+ "}
                                {t(`methods.${p.method}`)} {money(p.amount)}
                              </span>
                            ))}
                            {coins > 0 && (
                              <>
                                <span>+</span>
                                <CoinIcon size={11} /> {money(coins)}
                              </>
                            )}
                            {discount > 0 && <span className="text-fuchsia-600 dark:text-fuchsia-400">· −{money(discount)}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openReceipt(r.id)} className="rounded-lg p-2 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t("receipt")} title={t("receipt")}>
                            <ReceiptIcon className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          {r.status === "completed" && (
                            <button type="button" onClick={() => startRefund(r.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-red-500/10 hover:text-red-600">
                              <Undo2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                              {t("refund")}
                            </button>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div className="px-5 pb-4 sm:pl-[5.5rem]">
                          <table className="w-full text-sm">
                            <tbody>
                              {r.items.map((it, i) => (
                                <tr key={i} className="border-t border-border/40">
                                  <td className="py-2 pr-2">
                                    <span className="font-medium text-ink">{it.name}</span>
                                    {it.variant_label && <span className="ml-1.5 text-xs text-ink-soft">{it.variant_label}</span>}
                                    {it.refunded_quantity > 0 && <span className="ml-2 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{t("return.linesBack", { n: it.refunded_quantity })}</span>}
                                  </td>
                                  <td className="py-2 text-right text-xs text-ink-muted tabular-nums">
                                    {it.quantity} × {money(it.unit_price)}
                                  </td>
                                  <td className="w-28 py-2 text-right font-semibold text-ink tabular-nums">{money(it.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {r.refunded_at && <p className="mt-2 text-xs font-semibold text-red-600">{t("history.refundedAt", { time: timeOnly(r.refunded_at) })}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {data.results.length < data.total_count && (
            <div className="text-center">
              <button type="button" onClick={more} disabled={loadingMore} className="nz-liquid-chip rounded-full px-5 py-2 text-sm font-medium">
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}

      {receipt && <ReceiptDialog sale={receipt} reprint onClose={() => setReceipt(null)} />}
      {refunding && <RefundDialog sale={refunding} explain={explain} onClose={() => setRefunding(null)} onDone={refundDone} />}
    </div>
  );
}
