"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Printer, ReceiptText, RotateCcw, Search, ShieldCheck, Store as StoreIcon, Wallet } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { StatCard } from "@/components/charts/Charts";

type Days = 1 | 7 | 30;

interface BranchReceipt {
  number: string;
  token: string;
  source: "pos" | "online" | "manual";
  kind: "sale" | "refund";
  status: string;
  total: string;
  payment_method: string;
  issued_at: string;
  order_number: string;
  customer: string;
  phone: string;
  cashier: string;
  items: number;
  fiscal: boolean;
}

interface Data {
  days: number;
  today: { sales: number; revenue: string; refunds: number; refunded: string };
  receipts: BranchReceipt[];
}

function som(n: string | number): string {
  return Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** `/profile/store/receipts` -- the branch's receipts: today's totals, search, open the QR e-receipt or reprint it on the 80 mm roll. */
export default function StoreReceiptsPage() {
  const t = useTranslations("myStore.receipts");
  const [days, setDays] = useState<Days>(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/my-store/receipts?days=${days}&q=${encodeURIComponent(query)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!alive) return;
        if (b?.success) {
          setData(b.data);
          setFailed(false);
        } else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [days, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"><ReceiptText className="h-6 w-6 text-primary" aria-hidden="true" /> {t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <div role="tablist" aria-label={t("period")} className="flex gap-1.5">
          {([1, 7, 30] as const).map((d) => (
            <button key={d} type="button" role="tab" aria-selected={days === d} onClick={() => setDays(d)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${days === d ? "nz-cta" : "nz-liquid-chip text-ink-muted"}`}>
              {t(`days.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<ReceiptText className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("todaySales")} value={data ? String(data.today.sales) : "—"} />
        <StatCard icon={<Wallet className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("todayRevenue")} value={data ? som(data.today.revenue) : "—"} tone="info" />
        <StatCard icon={<RotateCcw className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("todayRefunds")} value={data ? String(data.today.refunds) : "—"} hint={data && data.today.refunds ? som(data.today.refunded) : undefined} tone="warning" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("fiscalShare")} value={data && data.receipts.length ? `${Math.round((data.receipts.filter((r) => r.fiscal).length / data.receipts.length) * 100)}%` : "—"} />
      </div>

      <Card className="p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} inputMode="search"
            className="w-full rounded-xl border border-border bg-surface-2/60 py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary" />
        </label>

        {failed ? (
          <p className="py-8 text-center text-sm text-rose-500">{t("loadError")}</p>
        ) : data === null ? (
          <div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : data.receipts.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} icon={<ReceiptText className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />} />
        ) : (
          <ul className="mt-3 divide-y divide-border/70">
            {data.receipts.map((r) => (
              <li key={r.token} className="flex items-center gap-3 py-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.kind === "refund" ? "bg-amber-500/14 text-amber-600" : r.source === "online" ? "bg-primary-soft text-primary" : "bg-emerald-500/14 text-emerald-600 dark:text-emerald-400"}`}>
                  {r.kind === "refund" ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : r.source === "online" ? <Globe className="h-4 w-4" aria-hidden="true" /> : <StoreIcon className="h-4 w-4" aria-hidden="true" />}
                </span>
                <a href={`/r/${r.token}`} target="_blank" rel="noopener" className="min-w-0 flex-1 hover:opacity-80">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-mono text-sm font-semibold text-ink">{r.number}</span>
                    {r.fiscal && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-label={t("fiscal")} />}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {when(r.issued_at)} · {r.order_number || r.cashier || t(`source.${r.source}`)}
                    {r.customer ? ` · ${r.customer}` : ""}{r.phone ? ` ${r.phone}` : ""}
                  </span>
                </a>
                <span className="text-right">
                  <span className="block whitespace-nowrap text-sm font-bold tabular-nums text-ink">{r.kind === "refund" ? "−" : ""}{som(r.total)}</span>
                  <span className="block text-xs text-ink-soft">{t("items", { count: r.items })}</span>
                </span>
                <a href={`/r/${r.token}?print=80&autoprint=1`} target="_blank" rel="noopener" aria-label={t("print")} title={t("print")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink">
                  <Printer className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
