"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Lightbulb, PackageCheck, RotateCcw, ShoppingBag, Timer, Store as StoreIcon, Truck, Undo2, Warehouse } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { StatCard } from "@/components/charts/Charts";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import type { StoreReport } from "@/components/store-dashboard/types";

type Days = 7 | 30 | 90;
type T = ReturnType<typeof useTranslations>;

function som(n: string | number): string {
  return Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

function mins(m: number | null, t: T): string {
  if (m == null) return "—";
  if (m < 1) return t("report.lessMinute");
  if (m < 60) return t("report.minutes", { n: Math.round(m) });
  if (m < 60 * 48) return t("report.hours", { n: (m / 60).toFixed(1) });
  return t("report.days", { n: (m / 1440).toFixed(1) });
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** One "me vs the network" line; `lowerIsBetter` for times and hand-backs. */
function Compare({ label, mine, network, display, lowerIsBetter }: { label: string; mine: number | null; network: number | null; display: (v: number | null) => string; lowerIsBetter?: boolean }) {
  const t = useTranslations("myStore");
  const known = mine != null && network != null;
  const better = known && (lowerIsBetter ? mine! < network! : mine! > network!);
  const worse = known && (lowerIsBetter ? mine! > network! : mine! < network!);
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1 text-sm text-ink-muted">{label}</span>
      <span className={`w-20 text-right text-sm font-bold tabular-nums sm:w-24 ${better ? "text-emerald-600 dark:text-emerald-400" : worse ? "text-rose-600 dark:text-rose-400" : "text-ink"}`}>{display(mine)}</span>
      <span className="w-20 text-right text-sm tabular-nums text-ink-soft sm:w-24">{display(network)}</span>
      <span className="hidden w-24 justify-end sm:flex">
        {better ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/14 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-3 w-3" aria-hidden="true" />{t("report.better")}</span>
        ) : worse ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/14 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400"><ArrowDownRight className="h-3 w-3" aria-hidden="true" />{t("report.worse")}</span>
        ) : known ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">{t("report.same")}</span>
        ) : null}
      </span>
    </li>
  );
}

function speedTone(m: number | null, sla: number): string {
  if (m == null) return "bg-surface-2 text-ink-soft";
  if (m <= sla) return "bg-emerald-500/14 text-emerald-600 dark:text-emerald-400";
  if (m <= 60) return "bg-amber-500/14 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/14 text-rose-600 dark:text-rose-400";
}

/**
 * «Mening ko'rsatkichlarim» -- the owner's branch report: online orders handed to the branch, how fast it accepts them
 * (median and the share within the SLA), how many it completed or handed back, and the same numbers for the whole
 * network to compare against. Cashiers never reach it (the shell sends them to the till).
 */
export default function StoreReportPage() {
  const t = useTranslations("myStore");
  const { store } = useStoreDashboard();
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<StoreReport | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async (d: Days) => {
    setState("loading");
    try {
      const res = await fetch(`/api/my-store/report?days=${d}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error();
      setData(body.data);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => load(days), 0);
    return () => window.clearTimeout(id);
  }, [days, load]);

  if (!store) return null;
  const me = data?.me;
  const net = data?.network;
  const sla = data?.sla ?? 15;
  const peak = Math.max(1, ...(data?.series ?? []).map((d) => d.n));
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

  const tips: string[] = [];
  if (me && me.handled) {
    if (me.accept_sla != null && me.accept_sla < 80) tips.push(t("report.tipSpeed", { sla }));
    if (me.handed_back_pct >= 10) tips.push(t("report.tipHandBack"));
    if (me.ready_min != null && me.ready_min > 60) tips.push(t("report.tipReady"));
    if (store.pickup_enabled === false) tips.push(t("report.tipPickupOff"));
    if (!tips.length) tips.push(t("report.tipGood"));
  }

  return (
    <div className="@container space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" /> {t("report.title")}</h2>
          <p className="text-sm text-ink-muted">{t("report.subtitle")}</p>
        </div>
        <div className="nz-glass flex gap-1 rounded-2xl p-1" role="tablist" aria-label={t("report.period")}>
          {([7, 30, 90] as Days[]).map((d) => (
            <button key={d} type="button" role="tab" aria-selected={days === d} onClick={() => setDays(d)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${days === d ? "nz-cta text-white" : "text-ink-muted hover:text-ink"}`}>
              {t("report.lastDays", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {state === "loading" && !data ? (
        <div className="space-y-3"><div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @4xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-64 w-full rounded-2xl" /></div>
      ) : state === "error" || !data || !me || !net ? (
        <Card className="flex items-center justify-between gap-3 p-6 text-sm text-ink-muted">
          {t("report.loadError")}
          <button type="button" onClick={() => load(days)} className="nz-glass inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-primary"><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("orders.refresh")}</button>
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${state === "loading" ? "opacity-60" : ""}`} aria-busy={state === "loading"}>
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @4xl:grid-cols-4">
            <StatCard icon={<ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("report.kpiHandled")} value={String(me.handled)} hint={t("report.kpiHandledHint", { pickup: me.pickup, delivery: me.delivery })} />
            <StatCard icon={<Timer className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("report.kpiAccept")} value={mins(me.accept_min, t)}
              hint={me.accept_sla != null ? t("report.kpiAcceptHint", { sla, pct: me.accept_sla }) : t("report.noData")} tone={me.accept_sla != null && me.accept_sla < 80 ? "warning" : "info"} />
            <StatCard icon={<PackageCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("report.kpiDone")} value={String(me.done)} hint={t("report.kpiDoneHint", { pct: me.done_pct, sum: som(me.revenue) })} tone="info" />
            <StatCard icon={<Warehouse className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("report.kpiHandedBack")} value={String(me.handed_back)}
              hint={t("report.kpiHandedBackHint", { pct: me.handed_back_pct, returned: me.returned, cancelled: me.cancelled })} tone={me.handed_back ? "danger" : "primary"} />
          </div>

          {me.handled === 0 ? (
            <EmptyState icon={<StoreIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />} title={t("report.emptyTitle")} description={t("report.emptyHint")} />
          ) : (
            <>
              <div className="grid items-start gap-5 @5xl:grid-cols-[1.2fr_1fr]">
                <Card className="p-5">
                  <h3 className="mb-1 text-lg font-semibold text-ink">{t("report.compareTitle")}</h3>
                  <p className="mb-2 text-xs text-ink-soft">{t("report.compareHint", { n: net.branches })}</p>
                  <div className="flex items-center gap-3 border-b border-border/70 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <span className="flex-1" /><span className="w-20 text-right sm:w-24">{t("report.colMine")}</span><span className="w-20 text-right sm:w-24">{t("report.colNetwork")}</span><span className="hidden w-24 sm:block" />
                  </div>
                  <ul className="divide-y divide-border/70">
                    <Compare label={t("report.rowAccept")} mine={me.accept_min} network={net.accept_min} display={(v) => mins(v, t)} lowerIsBetter />
                    <Compare label={t("report.rowSla", { sla })} mine={me.accept_sla} network={net.accept_sla} display={pct} />
                    <Compare label={t("report.rowReady")} mine={me.ready_min} network={net.ready_min} display={(v) => mins(v, t)} lowerIsBetter />
                    <Compare label={t("report.rowDone")} mine={me.done_pct} network={net.done_pct} display={pct} />
                    <Compare label={t("report.rowHandedBack")} mine={me.handed_back_pct} network={net.handed_back_pct} display={pct} lowerIsBetter />
                    <Compare label={t("report.rowVolume")} mine={me.handled} network={net.avg_handled} display={(v) => (v == null ? "—" : String(v))} />
                  </ul>
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink"><Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" /> {t("report.tipsTitle")}</h3>
                  <ul className="space-y-2">
                    {tips.map((tip) => (
                      <li key={tip} className="flex gap-2.5 rounded-xl bg-surface-2/70 px-3 py-2.5 text-sm text-ink">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{tip}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-ink-soft">{t("report.howCounted", { sla })}</p>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="mb-4 text-lg font-semibold text-ink">{t("report.trendTitle")}</h3>
                <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={t("report.trendTitle")}>
                  {data.series.map((d, i) => (
                    <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}: ${d.n}`}>
                      <div className={`w-full rounded-t-md transition-all ${d.n ? "bg-gradient-to-t from-primary/70 to-primary" : "bg-border/60"}`} style={{ height: d.n ? `${Math.max(6, (100 * d.n) / peak)}%` : "3px" }} />
                      {(i === 0 || i === data.series.length - 1 || (data.series.length > 10 && i % 7 === 0 && data.series.length - 1 - i > 3)) && (
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-ink-soft">{new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="h-5" />
              </Card>

              <div className="grid items-start gap-5 @2xl:grid-cols-2">
                <Card className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-ink">{t("report.ordersTitle")}</h3>
                    <Link href="/profile/store/orders" className="text-sm font-semibold text-primary">{t("allOrders")}</Link>
                  </div>
                  <ul className="divide-y divide-border/70">
                    {data.orders.map((o) => (
                      <li key={o.number}>
                        <Link href={`/profile/store/orders?o=${o.number}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${o.method === "pickup" ? "bg-orange-500/15 text-orange-500" : "bg-primary-soft text-primary"}`}>
                            {o.method === "pickup" ? <StoreIcon className="h-4 w-4" aria-hidden="true" /> : <Truck className="h-4 w-4" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-sm font-semibold text-ink">{o.number}</span>
                            <span className="block truncate text-xs text-ink-soft">{when(o.assigned_at)} · {t(`report.status.${o.status}` as "report.status.confirmed")}</span>
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${speedTone(o.accept_min, sla)}`} title={t("report.rowAccept")}>
                            {o.accept_min == null ? t("report.waiting") : mins(o.accept_min, t)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink"><Undo2 className="h-4 w-4 text-amber-500" aria-hidden="true" /> {t("report.handBacksTitle")}</h3>
                  {data.hand_backs.length ? (
                    <ul className="space-y-2">
                      {data.hand_backs.map((h) => (
                        <li key={`${h.number}-${h.at}`} className="rounded-xl bg-amber-500/10 px-3 py-2.5">
                          <p className="flex items-center justify-between gap-2 text-sm"><span className="font-mono font-semibold text-ink">{h.number}</span><span className="text-xs text-ink-soft">{when(h.at)}</span></p>
                          <p className="mt-0.5 text-sm text-ink-muted">{h.reason ? `«${h.reason}»` : t("report.noReason")}{h.actor ? ` · ${h.actor}` : ""}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-500/12 px-3 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t("report.noHandBacks")}</p>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
