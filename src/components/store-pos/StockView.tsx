"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Boxes, Info, Package, PackageX, Search, Wallet } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import { DonutChart } from "@/components/charts/Charts";
import { money, pos } from "./api";
import type { PosStock } from "./types";

type Filter = "all" | "ok" | "low" | "out";

const STATE_STYLE = {
  ok: { chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  low: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  out: { chip: "bg-red-500/12 text-red-600", bar: "bg-red-500" },
} as const;

/**
 * The shelf, read-only: every product this store carries with its selling price
 * and what's left, searchable, plus a low-stock chart so the owner can ask
 * NutriZone for a restock in time. Stock is changed only by NutriZone staff
 * (deliveries/transfers) and by POS sales.
 */
export default function StockView() {
  const t = useTranslations("storePos.stock");
  const tp = useTranslations("storePos");
  const [data, setData] = useState<PosStock | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ status: filter });
      if (q.trim()) params.set("q", q.trim());
      pos<PosStock>(`stock?${params}`).then((res) => {
        if (!cancelled && res.ok) setData(res.data);
      });
    }, q ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, filter]);

  if (!data) return <div className="nz-liquid h-72 animate-pulse rounded-3xl" aria-hidden="true" />;
  const s = data.summary;
  const maxAttention = Math.max(s.low_threshold, ...data.attention.map((a) => a.stock));

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary-soft/50 px-4 py-3 text-xs text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
        {t("readOnlyNote")}
      </p>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Boxes, label: t("products"), value: String(s.products) },
          { icon: Package, label: t("units"), value: money(s.units) },
          { icon: Wallet, label: t("value"), value: `${money(s.value)} ${tp("som")}` },
          { icon: AlertTriangle, label: t("needsAttention"), value: String(s.low + s.out), warn: s.low + s.out > 0 },
        ].map(({ icon: Icon, label, value, warn }) => (
          <div key={label} className="nz-liquid rounded-2xl p-4">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              <Icon className={`h-3.5 w-3.5 ${warn ? "text-amber-500" : ""}`} strokeWidth={2} aria-hidden="true" />
              {label}
            </dt>
            <dd className={`mt-2 text-xl font-extrabold tabular-nums ${warn ? "text-amber-600 dark:text-amber-400" : "text-ink"}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="nz-liquid rounded-3xl p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">{t("health")}</h3>
          <DonutChart
            centerValue={String(s.products)}
            centerLabel={t("products")}
            segments={[
              { label: t("state.ok"), value: s.ok, color: "#10b981" },
              { label: t("state.low", { n: s.low_threshold }), value: s.low, color: "#f59e0b" },
              { label: t("state.out"), value: s.out, color: "#ef4444" },
            ]}
          />
        </section>

        <section className="nz-liquid rounded-3xl p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
            <PackageX className="h-4 w-4 text-amber-500" strokeWidth={2} aria-hidden="true" />
            {t("lowTitle")}
          </h3>
          <p className="mb-4 text-xs text-ink-muted">{t("lowSubtitle", { n: s.low_threshold })}</p>
          {data.attention.length === 0 ? (
            <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">{t("allGood")}</p>
          ) : (
            <ul className="space-y-3">
              {data.attention.map((item) => (
                <li key={item.variant_id} className="flex items-center gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white">
                    <MediaImage src={item.image_url} alt="" fit="contain" padding="p-0.5" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.5} />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-ink">
                        {item.name}
                        {item.variant_label && <span className="ml-1 font-normal text-ink-soft">{item.variant_label}</span>}
                      </span>
                      <span className={`shrink-0 font-bold tabular-nums ${item.state === "out" ? "text-red-600" : "text-amber-600 dark:text-amber-400"}`}>{item.stock === 0 ? t("state.out") : t("left", { n: item.stock })}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
                      <div className={`h-full rounded-full ${STATE_STYLE[item.state].bar}`} style={{ width: `${Math.max(item.stock === 0 ? 100 : 6, (item.stock / maxAttention) * 100)}%`, opacity: item.stock === 0 ? 0.35 : 1 }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="nz-liquid overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="nz-glass-input w-full rounded-full py-2 pl-9 pr-3 text-sm" />
          </div>
          <div className="inline-flex rounded-full bg-surface-2/60 p-1">
            {(["all", "ok", "low", "out"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? "bg-surface text-ink shadow" : "text-ink-muted hover:text-ink"}`}>
                {f === "all" ? t("filterAll") : t(`state.${f}`, { n: s.low_threshold })}
              </button>
            ))}
          </div>
        </div>
        {data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  <th className="px-5 py-2.5">{t("colProduct")}</th>
                  <th className="px-3 py-2.5 text-right">{t("colPrice")}</th>
                  <th className="px-3 py-2.5 text-right">{t("colStock")}</th>
                  <th className="px-5 py-2.5 text-right">{t("colValue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.results.map((item) => (
                  <tr key={item.variant_id} className="hover:bg-surface-2/30">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                          <MediaImage src={item.image_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.5} />} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{item.name}</p>
                          <p className="text-[11px] text-ink-soft">
                            {item.sku}
                            {item.variant_label ? ` · ${item.variant_label}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">{item.price ? money(item.price) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${STATE_STYLE[item.state].chip}`}>{item.stock}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-ink-muted tabular-nums">{item.stock_value ? money(item.stock_value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
