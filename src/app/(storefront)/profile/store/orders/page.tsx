"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bike, Check, ChevronRight, Clock, LoaderCircle, MessageSquareText, Package, PackageCheck, Phone, RotateCcw, Search, ShoppingBag, Store as StoreIcon, Truck, Undo2 } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import MapLinks from "@/components/MapLinks";
import MediaImage from "@/components/MediaImage";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import { useStoreOrders } from "@/components/store-dashboard/useStoreOrders";
import type { StoreOrder, StoreOrderStep } from "@/components/store-dashboard/types";

type Tab = "active" | "new" | "ready" | "done";

function som(n: string | number): string {
  return Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

function ago(iso: string, t: ReturnType<typeof useTranslations>): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return t("orders.justNow");
  if (m < 60) return t("orders.minutesAgo", { count: m });
  const h = Math.round(m / 60);
  return h < 24 ? t("orders.hoursAgo", { count: h }) : new Date(iso).toLocaleDateString("ru-RU");
}

/** A short chime for a new order (Web Audio; silent when the browser blocks sound before a click). */
function chime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.16);
      o.stop(ctx.currentTime + i * 0.16 + 0.14);
    });
  } catch {
    /* no audio */
  }
}

const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  processing: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  shipped: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-slate-500/15 text-ink-soft",
  returned: "bg-slate-500/15 text-ink-soft",
};

function OrderCard({ order, highlighted, busy, onStep }: { order: StoreOrder; highlighted: boolean; busy: string | null; onStep: (o: StoreOrder, s: StoreOrderStep, reason?: string) => void }) {
  const t = useTranslations("myStore");
  const ref = useRef<HTMLElement>(null);
  const [handBack, setHandBack] = useState(false);
  const [reason, setReason] = useState("");
  const pickup = order.method === "pickup";
  const forward = order.steps.filter((s) => s.action !== "hand_back");
  const back = order.steps.find((s) => s.action === "hand_back");
  const hasPoint = !pickup && order.address.latitude != null && order.address.longitude != null;

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  return (
    <article ref={ref} className={`nz-glass overflow-hidden rounded-2xl transition-shadow ${highlighted ? "ring-2 ring-primary shadow-xl" : ""} ${order.status === "pending_payment" ? "border-l-4 border-l-rose-500" : ""}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${pickup ? "bg-orange-500/15 text-orange-500" : "bg-primary-soft text-primary"}`}>
          {pickup ? <StoreIcon className="h-4.5 w-4.5" aria-hidden="true" /> : <Truck className="h-4.5 w-4.5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-ink">{order.number}</p>
          <p className="flex items-center gap-1 text-xs text-ink-soft">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {ago(order.placed_at, t)} · {pickup ? t("orders.pickup") : t("orders.delivery")}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[order.status] ?? "bg-surface-2 text-ink"}`}>{order.status_label}</span>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-[1.3fr_1fr]">
        <ul className="space-y-2">
          {order.lines.map((l) => (
            <li key={l.variant_id} className="flex items-center gap-3">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                <MediaImage src={l.image || null} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-4 w-4 text-slate-400" aria-hidden="true" />} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-ink">{l.name}</span>
                <span className="block text-xs text-ink-soft">{l.sku} · ×{l.quantity}</span>
              </span>
              <span className="text-sm font-semibold text-ink">{som(l.total)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-border/70 pt-2 text-sm">
            <span className="text-ink-muted">{t("orders.units", { count: order.units })}</span>
            <span className="text-base font-bold text-ink">{som(order.total)} {t("orders.sum")}</span>
          </li>
        </ul>

        <div className="space-y-2 rounded-xl bg-surface-2/60 p-3 text-sm">
          <p className="font-semibold text-ink">{order.customer.name}</p>
          {order.customer.phone && (
            <a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1.5 font-medium text-primary">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {order.customer.phone}
            </a>
          )}
          {pickup ? (
            <p className="text-xs text-ink-muted">{t("orders.pickupHint")}</p>
          ) : (
            <>
              <p className="text-xs text-ink-muted">
                {order.address.line1}
                {order.address.line2 && <span className="block text-ink">{order.address.line2}</span>}
                <span className="block">{order.address.city}</span>
              </p>
              {hasPoint && <MapLinks latitude={order.address.latitude!} longitude={order.address.longitude!} label={`${order.number} · ${order.customer.name}`} compact />}
            </>
          )}
          {order.comment && (
            <p className="flex gap-1.5 rounded-lg bg-amber-500/10 p-2 text-xs text-ink">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" /> {order.comment}
            </p>
          )}
        </div>
      </div>

      {(forward.length > 0 || back) && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-surface-2/30 px-4 py-3">
          {forward.map((s) => (
            <button key={s.action} type="button" disabled={!!busy} onClick={() => onStep(order, s)}
              className="nz-cta inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60">
              {busy === s.action ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : s.action === "deliver" ? <PackageCheck className="h-4 w-4" aria-hidden="true" /> : s.action === "ship" ? (pickup ? <ShoppingBag className="h-4 w-4" aria-hidden="true" /> : <Bike className="h-4 w-4" aria-hidden="true" />) : <Check className="h-4 w-4" aria-hidden="true" />}
              {s.label}
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
            </button>
          ))}
          {back && !handBack && (
            <button type="button" disabled={!!busy} onClick={() => setHandBack(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink">
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("orders.handBack")}
            </button>
          )}
          {back && handBack && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("orders.handBackReason")} className="nz-glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" autoFocus />
              <button type="button" disabled={!!busy} onClick={() => onStep(order, back, reason)} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                {busy === "hand_back" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : t("orders.handBackConfirm")}
              </button>
              <button type="button" onClick={() => setHandBack(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-2">{t("orders.cancel")}</button>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}

function OrdersInner() {
  const t = useTranslations("myStore");
  const params = useSearchParams();
  const focus = params.get("o") ?? "";
  const { store } = useStoreDashboard();
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busy, setBusy] = useState<{ number: string; action: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const scope = tab === "done" ? "done" : "active";
  const { data, loading, error, reload } = useStoreOrders(scope, debounced, () => chime());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const orders = useMemo(() => {
    const list = data?.orders ?? [];
    if (tab === "new") return list.filter((o) => o.status === "pending_payment");
    if (tab === "ready") return list.filter((o) => o.status === "shipped");
    return list;
  }, [data, tab]);

  async function step(order: StoreOrder, s: StoreOrderStep, reason = "") {
    setBusy({ number: order.number, action: s.action });
    setMessage(null);
    try {
      const res = await fetch(`/api/my-store/orders/${order.number}/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: s.action, reason }) });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setMessage({ text: body?.error?.code === "INSUFFICIENT_STOCK" ? t("orders.noStock") : body?.error?.message ?? t("orders.stepError"), bad: true });
      } else {
        setMessage({ text: s.action === "hand_back" ? t("orders.handedBack", { number: order.number }) : t("orders.stepDone", { number: order.number, step: s.label }) });
      }
      await reload();
    } catch {
      setMessage({ text: t("orders.stepError"), bad: true });
    } finally {
      setBusy(null);
    }
  }

  if (!store) return null;
  const counts = data?.counts ?? { active: 0, new: 0, ready: 0, done: 0 };
  const tabs: { key: Tab; label: string; n: number; tone?: string }[] = [
    { key: "active", label: t("orders.tabActive"), n: counts.active },
    { key: "new", label: t("orders.tabNew"), n: counts.new, tone: counts.new ? "bg-rose-500 text-white" : undefined },
    { key: "ready", label: t("orders.tabReady"), n: counts.ready },
    { key: "done", label: t("orders.tabDone"), n: counts.done },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">{t("orders.title")}</h2>
          <p className="text-sm text-ink-muted">{store.pickup_enabled === false ? t("orders.subtitlePickupOff") : t("orders.subtitle")}</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="nz-glass rounded-xl px-3 py-2"><b className="text-base text-ink">{data?.today.done ?? 0}</b> <span className="text-ink-muted">{t("orders.doneToday")}</span></span>
          <span className="nz-glass rounded-xl px-3 py-2"><b className="text-base text-ink">{som(data?.today.revenue ?? 0)}</b> <span className="text-ink-muted">{t("orders.sum")}</span></span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="nz-glass flex gap-1 overflow-x-auto rounded-2xl p-1 [scrollbar-width:none]">
          {tabs.map((x) => (
            <button key={x.key} type="button" onClick={() => setTab(x.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${tab === x.key ? "nz-cta text-white" : "text-ink-muted hover:text-ink"}`}>
              {x.label}
              <span className={`rounded-full px-1.5 text-[11px] ${x.tone ?? (tab === x.key ? "bg-white/25" : "bg-surface-2")}`}>{x.n}</span>
            </button>
          ))}
        </div>
        <label className="nz-glass-input ml-auto flex min-w-[200px] flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:max-w-xs">
          <Search className="h-4 w-4 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("orders.search")} aria-label={t("orders.search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <button type="button" onClick={() => reload()} className="nz-glass flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:text-primary" aria-label={t("orders.refresh")} title={t("orders.refresh")}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {message && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm font-medium ${message.bad ? "bg-rose-500/12 text-rose-600 dark:text-rose-400" : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"}`}>{message.text}</p>
      )}

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-44 w-full rounded-2xl" /><Skeleton className="h-44 w-full rounded-2xl" /></div>
      ) : error ? (
        <Card className="p-6 text-sm text-ink-muted">{t("orders.loadError")}</Card>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />} title={tab === "done" ? t("orders.emptyDone") : t("orders.emptyActive")} description={t("orders.emptyHint")} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.number} order={o} highlighted={o.number === focus} busy={busy?.number === o.number ? busy.action : null} onStep={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreOrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <OrdersInner />
    </Suspense>
  );
}
