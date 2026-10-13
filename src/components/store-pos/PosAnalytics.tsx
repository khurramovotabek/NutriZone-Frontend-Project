"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Clock3, Package, Receipt, ShoppingBag, TrendingUp, Undo2, Users } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { DonutChart } from "@/components/charts/Charts";
import { money, pos } from "./api";
import type { PosAnalytics as Data } from "./types";

type Period = "today" | "7d" | "30d";

/** Revenue bars with hover values -- hourly for today, daily for 7/30 days. */
function RevenueBars({ series, som }: { series: Data["series"]; som: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((s) => Number(s.revenue)));
  const dense = series.length > 14;
  return (
    <div>
      <div className="relative flex h-56 items-end gap-[3px]" role="img" aria-label="revenue chart">
        {series.map((s, i) => {
          const v = Number(s.revenue);
          const h = Math.max(v > 0 ? 4 : 1, (v / max) * 100);
          return (
            <div key={i} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${v > 0 ? "bg-gradient-to-t from-primary/70 to-primary" : "bg-surface-3/60"} ${hover === i ? "brightness-125" : ""}`}
                style={{ height: `${h}%` }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-neutral-900 px-3 py-2 text-[11px] text-white shadow-xl">
                  <p className="font-bold">{s.label}</p>
                  <p className="tabular-nums">
                    {money(v)} {som}
                  </p>
                  <p className="opacity-70">× {s.count}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] text-[10px] text-ink-soft">
        {series.map((s, i) => (
          <span key={i} className="flex-1 text-center tabular-nums">
            {!dense || i % 3 === 0 ? s.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PosAnalytics() {
  const t = useTranslations("storePos");
  const [period, setPeriod] = useState<Period>("today");
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    pos<Data>(`analytics?period=${period}`).then((res) => {
      if (!cancelled && res.ok) setData(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const k = data?.kpis;
  const cards = k
    ? [
        { icon: TrendingUp, label: t("kpiRevenue"), value: money(k.revenue), suffix: t("som"), big: true },
        { icon: Receipt, label: t("kpiSales"), value: String(k.sales_count) },
        { icon: BarChart3, label: t("kpiAverage"), value: money(k.average), suffix: t("som") },
        { icon: ShoppingBag, label: t("kpiItems"), value: String(k.items_sold) },
        { icon: Users, label: t("analytics.customers"), value: String(k.customers) },
        { icon: Undo2, label: t("kpiRefunded"), value: k.refunds_count ? `${k.refunds_count} · ${money(k.refunded)}` : "0" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div role="tablist" className="nz-liquid inline-flex rounded-full p-1">
        {(["today", "7d", "30d"] as const).map((p) => (
          <button key={p} role="tab" aria-selected={period === p} type="button" onClick={() => setPeriod(p)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${period === p ? "bg-primary text-primary-contrast shadow" : "text-ink-muted hover:text-ink"}`}>
            {t(`analytics.periods.${p}`)}
          </button>
        ))}
      </div>

      {!data || !k ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="nz-liquid h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {cards.map(({ icon: Icon, label, value, suffix, big }) => (
              <div key={label} className={`nz-liquid relative overflow-hidden rounded-2xl p-4 ${big ? "col-span-2 md:col-span-1 xl:col-span-1" : ""}`}>
                {big && <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl" />}
                <dt className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {label}
                </dt>
                <dd className={`relative mt-2 break-words font-extrabold leading-tight tabular-nums ${big ? "text-2xl text-primary" : "text-lg text-ink"}`}>
                  {value}
                  {suffix && <span className="ml-1 text-xs font-medium text-ink-soft">{suffix}</span>}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="nz-liquid rounded-3xl p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{period === "today" ? t("analytics.byHour") : t("analytics.byDay")}</h3>
                {data.peak && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    {t("analytics.peak", { label: period === "today" ? `${data.peak.label}:00` : data.peak.label, amount: money(data.peak.revenue) })}
                  </span>
                )}
              </div>
              <RevenueBars series={data.series} som={t("som")} />
            </section>

            <section className="nz-liquid rounded-3xl p-5">
              <h3 className="mb-4 text-sm font-bold text-ink">{t("analytics.paymentSplit")}</h3>
              {Number(k.revenue) > 0 ? (
                <DonutChart
                  centerValue={money(k.revenue)}
                  centerLabel={t("som")}
                  segments={[
                    { label: t("methods.cash"), value: Number(k.cash), color: "#10b981" },
                    { label: t("methods.uzcard"), value: Number(k.uzcard), color: "#2563eb" },
                    { label: t("methods.humo"), value: Number(k.humo), color: "#0d9488" },
                    { label: t("analytics.coins"), value: Number(k.coins), color: "#e0a91b" },
                  ]}
                />
              ) : (
                <p className="text-sm text-ink-muted">{t("noSalesYet")}</p>
              )}
              {Number(k.coins) > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                  <CoinIcon size={14} />
                  {t("analytics.coinsNote", { coins: money(k.coins) })}
                </p>
              )}
            </section>
          </div>

          <section className="nz-liquid rounded-3xl p-5">
            <h3 className="mb-4 text-sm font-bold text-ink">{t("topProducts")}</h3>
            {data.top_products.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("noSalesYet")}</p>
            ) : (
              <ol className="grid gap-3 md:grid-cols-2">
                {data.top_products.map((p, i) => {
                  const share = Number(k.revenue) > 0 ? (Number(p.revenue) / Number(k.revenue)) * 100 : 0;
                  return (
                    <li key={p.variant_id ?? i} className="flex items-center gap-3 rounded-2xl bg-surface-2/40 p-3">
                      <span className="w-5 text-center text-sm font-black text-ink-soft">{i + 1}</span>
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                        <MediaImage src={p.image_url ?? null} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} />} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{p.name ?? "—"}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${Math.max(3, share)}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink tabular-nums">{money(p.revenue)}</p>
                        <p className="text-[11px] text-ink-soft tabular-nums">× {p.quantity}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
