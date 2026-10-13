"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, Boxes, ChevronRight, History, PackageCheck, RefreshCw, Search, Truck, Warehouse } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { som } from "./api";
import { useIncomingTransfers } from "./useIncomingTransfers";
import type { TransferRow } from "./types";

const TONE: Record<string, string> = {
  in_transit: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  receiving: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  partial: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  received: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-slate-500/15 text-ink-soft",
  ready: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
};

function Row({ row, onOpen }: { row: TransferRow; onOpen: (id: string) => void }) {
  const t = useTranslations("myStore.receiving");
  const actionable = row.direction === "incoming" && ["in_transit", "receiving", "partial"].includes(row.status) && !row.discrepancy_open;
  const progress = row.sent ? Math.min(100, Math.round((row.received * 100) / row.sent)) : 0;
  return (
    <button type="button" onClick={() => onOpen(row.id)} className={`nz-glass group flex w-full flex-wrap items-center gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${actionable ? "border-l-4 border-l-primary" : ""}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${row.direction === "incoming" ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-muted"}`}>
        {row.source.kind === "warehouse" ? <Warehouse className="h-5 w-5" aria-hidden="true" /> : <Truck className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-extrabold text-ink">{row.number}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[row.status] ?? "bg-surface-2 text-ink-soft"}`}>{t(`status.${row.status}`)}</span>
          {row.discrepancy_open && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/12 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{t("awaitingManager")}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          {row.source.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> {row.destination.name}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {row.dispatched_at ? t("sentAt", { at: row.dispatched_at, by: row.dispatched_by || "—" }) : row.created_at}
          {row.received_at ? ` · ${t("receivedAt", { at: row.received_at })}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-extrabold tabular-nums text-ink">{row.received}<span className="text-sm text-ink-soft"> / {row.sent}</span></p>
        <p className="text-[11px] text-ink-soft">{t("linesValue", { lines: row.lines, value: som(row.value) })}</p>
        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-surface-2" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${progress}%` }} /></div>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold ${actionable ? "nz-cta text-white" : "bg-surface-2 text-ink"}`}>
        {actionable ? <><PackageCheck className="h-4 w-4" aria-hidden="true" />{t("receiveCta")}</> : <>{t("openCta")}<ChevronRight className="h-4 w-4" aria-hidden="true" /></>}
      </span>
    </button>
  );
}

export default function TransferList({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useTranslations("myStore.receiving");
  const [scope, setScope] = useState<"incoming" | "history">("incoming");
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const { data, error, loading, reload } = useIncomingTransfers(scope, query);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          [t("kpiIncoming"), data?.counts.incoming ?? 0, Truck, "text-primary"],
          [t("kpiReceiving"), data?.counts.receiving ?? 0, Boxes, "text-amber-500"],
          [t("kpiDiscrepancy"), data?.counts.discrepancy ?? 0, AlertTriangle, "text-red-500"],
        ].map(([label, n, Icon, tone]) => {
          const I = Icon as typeof Truck;
          return (
            <Card key={String(label)} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
              <I className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${tone}`} aria-hidden="true" />
              <div className="min-w-0"><p className="text-2xl font-extrabold tabular-nums text-ink">{String(n)}</p><p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-ink-soft sm:text-[11px]">{String(label)}</p></div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="nz-glass inline-flex rounded-xl p-1">
          {(["incoming", "history"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={scope === s} onClick={() => setScope(s)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${scope === s ? "nz-cta text-white" : "text-ink-muted hover:text-ink"}`}>
              {s === "incoming" ? <Truck className="h-4 w-4" aria-hidden="true" /> : <History className="h-4 w-4" aria-hidden="true" />}{t(s === "incoming" ? "tabIncoming" : "tabHistory")}
              {s === "incoming" && !!data?.counts.incoming && <span className="rounded-full bg-white/25 px-1.5 text-xs">{data.counts.incoming}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(typed.trim()); }} className="nz-glass-input order-last flex min-w-0 flex-1 basis-full items-center gap-2 px-3 sm:order-none sm:basis-0">
          <Search className="h-4 w-4 text-ink-soft" aria-hidden="true" />
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </form>
        <Button variant="secondary" onClick={() => reload()} aria-label={t("refresh")}><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button>
      </div>

      {loading && !data ? (
        <div className="grid gap-2.5" aria-busy="true">{[0, 1, 2].map((k) => <Skeleton key={k} className="h-24 w-full rounded-2xl" />)}</div>
      ) : error && !data ? (
        <ErrorState message={t("loadError")} action={<Button variant="secondary" onClick={() => reload()}>{t("retry")}</Button>} />
      ) : !data?.results.length ? (
        <EmptyState
          icon={scope === "incoming" ? <Truck aria-hidden="true" /> : <History aria-hidden="true" />}
          title={query ? t("emptySearch") : scope === "incoming" ? t("emptyIncoming") : t("emptyHistory")}
          description={query ? undefined : scope === "incoming" ? t("emptyIncomingHint") : undefined}
        />
      ) : (
        <div className="grid gap-2.5">{data.results.map((r) => <Row key={r.id} row={r} onOpen={onOpen} />)}</div>
      )}
    </div>
  );
}
