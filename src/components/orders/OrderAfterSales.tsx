"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CalendarClock, Check, CircleCheck, Clock, LoaderCircle, Minus, Package, Plus, RotateCcw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { AfterSales, Order } from "@/lib/orders-api";
import type { VariantDisplay } from "@/lib/variant-display";
import { Badge, Button } from "@/components/ui";
import ProductMediaImage from "@/components/ProductMediaImage";
import { useIsClient } from "@/hooks/useIsClient";
import { formatMoney } from "@/lib/account-insights";
import { formatDate } from "@/lib/dates";

type Tone = "neutral" | "success" | "pending" | "error";
const REQUEST_TONE: Record<string, Tone> = { requested: "pending", approved: "pending", received: "pending", refunded: "success", completed: "success", rejected: "error", closed: "neutral" };
const CANCEL_PRESETS = ["changedMind", "foundElsewhere", "tooSlow", "wrongDetails", "other"] as const;

async function fetchAfterSales(orderNumber: string): Promise<AfterSales | null> {
  try {
    const res = await fetch(`/api/orders/${orderNumber}/after-sales`, { cache: "no-store" });
    const body = await res.json();
    return res.ok && body.success ? (body.data as AfterSales) : null;
  } catch {
    return null; // the card is optional: without it the page still shows the order
  }
}

interface Props {
  order: Order;
  displays: Record<string, VariantDisplay | undefined>;
  /** Called after a successful cancel / return so the page reloads the order. */
  onChanged: () => void;
}

/**
 * "Order actions" card on the customer's order page: cancel (instantly before packing, otherwise a request
 * the store approves), ask for a return after delivery, and the state of earlier requests.
 * Backed by /api/orders/<n>/after-sales, /cancel and /return (owner-only on the backend).
 */
export default function OrderAfterSales({ order, displays, onChanged }: Props) {
  const t = useTranslations("orders.afterSales");
  const locale = useLocale();
  const [info, setInfo] = useState<AfterSales | null>(null);
  const [dialog, setDialog] = useState<"cancel" | "return" | null>(null);

  useEffect(() => {
    let alive = true;
    // Reloads when the order's status changes (polling on the page, or after an action here).
    fetchAfterSales(order.order_number).then((data) => {
      if (alive && data) setInfo(data);
    });
    return () => {
      alive = false;
    };
  }, [order.order_number, order.status]);

  if (!info) return null;
  const hasRequests = info.returns.length > 0 || info.cancellations.length > 0;
  const delivered = info.status === "delivered" || info.status === "completed";
  const hasContent = Boolean(info.can_cancel || info.cancel_pending || info.can_return || hasRequests || (delivered && info.return_window_expired));

  const deadline = info.return_deadline ? new Date(info.return_deadline) : null;

  function done(next: AfterSales) {
    setInfo(next);
    onChanged();
  }

  const dialogs = (
    <>
      {dialog === "cancel" && <CancelDialog order={order} mode={info.can_cancel === "now" ? "now" : "request"} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "return" && <ReturnDialog order={order} info={info} displays={displays} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
  // After an instant cancel nothing is left to show, but the success dialog must stay until the customer closes it.
  if (!hasContent) return dialog ? dialogs : null;

  return (
    <section className="nz-glass rounded-3xl p-5" aria-labelledby="order-actions-title">
      <h2 id="order-actions-title" className="text-sm font-semibold text-ink">{t("title")}</h2>

      <div className="mt-4 space-y-3">
        {info.can_cancel && (
          <div>
            <Button type="button" variant="secondary" className="w-full !text-danger hover:!border-danger" onClick={() => setDialog("cancel")}>
              <Ban className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              {info.can_cancel === "now" ? t("cancelNow") : t("cancelRequest")}
            </Button>
            <p className="mt-1.5 text-xs text-ink-soft">{info.can_cancel === "now" ? t("cancelNowHint") : t("cancelRequestHint")}</p>
          </div>
        )}
        {info.cancel_pending && (
          <p className="flex items-start gap-2 rounded-2xl bg-warning/10 p-3 text-xs font-medium text-ink">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.9} aria-hidden="true" />
            {t("cancelPending")}
          </p>
        )}
        {info.can_return && (
          <div>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setDialog("return")}>
              <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              {t("returnRequest")}
            </Button>
            {deadline && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
                <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                {t("returnDeadline", { date: formatDate(deadline, locale, "long") })}
              </p>
            )}
          </div>
        )}
        {delivered && info.return_window_expired && !info.can_return && <p className="rounded-2xl bg-surface-2/60 p-3 text-xs text-ink-muted">{t("returnExpired")}</p>}
      </div>

      {hasRequests && (
        <ul className="mt-4 space-y-2 border-t border-border/70 pt-4">
          {info.returns.map((r) => (
            <li key={r.number} className="flex items-start gap-3 rounded-2xl bg-surface-2/50 p-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{t("returnLabel", { number: r.number })}</p>
                <p className="text-xs text-ink-soft">
                  {formatDate(new Date(r.created_at), locale, "date")} · {t(`returnReason.${r.reason}` as "returnReason.other")}
                </p>
                {r.refund_amount && <p className="mt-0.5 text-xs font-semibold text-success">{t("refunded", { amount: formatMoney(Number(r.refund_amount), order.currency) })}</p>}
                {r.rejection_reason && <p className="mt-1 text-xs text-ink-muted">{t("rejectionReason", { reason: r.rejection_reason })}</p>}
                <div className="mt-1.5">
                  <Badge tone={REQUEST_TONE[r.status] ?? "neutral"}>{t(`status.${r.status}` as "status.requested")}</Badge>
                </div>
              </div>
            </li>
          ))}
          {info.cancellations.map((c, i) => (
            <li key={`c${i}`} className="flex items-start gap-3 rounded-2xl bg-surface-2/50 p-3">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={1.9} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t("cancellationLabel")}</p>
                <p className="text-xs text-ink-soft">{formatDate(new Date(c.created_at), locale, "date")}</p>
                {c.rejection_reason && <p className="mt-1 text-xs text-ink-muted">{t("rejectionReason", { reason: c.rejection_reason })}</p>}
                <div className="mt-1.5">
                  <Badge tone={REQUEST_TONE[c.status] ?? "neutral"}>{t(`status.${c.status}` as "status.requested")}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogs}
    </section>
  );
}

/* ------------------------------------------------------------------ dialogs */

function useDialogChrome(onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return closeRef;
}

function Shell({ title, icon, onClose, closeRef, children }: { title: string; icon: React.ReactNode; onClose: () => void; closeRef: React.RefObject<HTMLButtonElement | null>; children: React.ReactNode }) {
  const mounted = useIsClient();
  const tCommon = useTranslations("common");
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="nz-rise max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">{icon}</span>
          <h2 className="flex-1 pt-2 text-base font-bold text-ink">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={tCommon("close")} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
            <X className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Success({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const tCommon = useTranslations("common");
  return (
    <div className="py-4 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/14 text-success">
        <CircleCheck className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="mt-3 font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{text}</p>
      <Button type="button" className="mt-5 w-full" onClick={onClose}>
        {tCommon("close")}
      </Button>
    </div>
  );
}

function useErrorText() {
  const t = useTranslations("orders.afterSales");
  return (code: string | undefined) => {
    const known = ["ORDER_NOT_RETURNABLE", "RETURN_WINDOW_EXPIRED", "ORDER_DELIVERED_USE_RETURN", "ORDER_NOT_CANCELLABLE", "CANCELLATION_PENDING", "QUANTITY_EXCEEDS_REMAINING", "NO_LINES"];
    return code && known.includes(code) ? t(`errors.${code}` as "errors.NO_LINES") : t("errors.generic");
  };
}

function CancelDialog({ order, mode: modeAtOpen, onClose, onDone }: { order: Order; mode: "now" | "request"; onClose: () => void; onDone: (next: AfterSales) => void }) {
  const t = useTranslations("orders.afterSales");
  // The order's possibilities change once it's cancelled; the dialog keeps describing what the customer opened it for.
  const [mode] = useState(modeAtOpen);
  const errorText = useErrorText();
  const closeRef = useDialogChrome(onClose);
  const [preset, setPreset] = useState<(typeof CANCEL_PRESETS)[number]>("changedMind");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"cancelled" | "requested">("cancelled");

  async function submit() {
    if (state === "sending") return;
    setState("sending");
    setError(null);
    const text = [preset !== "other" ? t(`cancelPreset.${preset}`) : "", comment.trim()].filter(Boolean).join(". ");
    try {
      const res = await fetch(`/api/orders/${order.order_number}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: preset === "other" ? "other" : "customer_request", comment: text }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(errorText(body.error?.code));
        setState("idle");
        return;
      }
      setOutcome(body.data.outcome);
      setState("done");
      onDone(body.data as AfterSales);
    } catch {
      setError(t("errors.generic"));
      setState("idle");
    }
  }

  return (
    <Shell title={mode === "now" ? t("cancelTitle", { number: order.order_number }) : t("cancelRequestTitle")} icon={<Ban className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />} onClose={onClose} closeRef={closeRef}>
      {state === "done" ? (
        <Success title={outcome === "cancelled" ? t("cancelledTitle") : t("requestSentTitle")} text={outcome === "cancelled" ? t("cancelledText") : t("cancelRequestSentText")} onClose={onClose} />
      ) : (
        <>
          <p className="mt-3 text-sm text-ink-muted">{mode === "now" ? t("cancelNowText") : t("cancelRequestText")}</p>
          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("why")}</legend>
            <div className="flex flex-wrap gap-2">
              {CANCEL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={preset === p}
                  onClick={() => setPreset(p)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${preset === p ? "border-primary bg-primary text-white" : "border-border text-ink-muted hover:border-primary hover:text-ink"}`}
                >
                  {t(`cancelPreset.${p}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink-soft" htmlFor="cancel-comment">{t("commentLabel")}</label>
          <textarea id="cancel-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} className="mt-1.5 w-full rounded-2xl border border-border bg-surface-2/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary" />
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>{t("keepOrder")}</Button>
            <Button type="button" variant="destructive" onClick={submit} disabled={state === "sending"}>
              {state === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Ban className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
              {mode === "now" ? t("confirmCancel") : t("sendRequest")}
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}

function ReturnDialog({ order, info, displays, onClose, onDone }: { order: Order; info: AfterSales; displays: Record<string, VariantDisplay | undefined>; onClose: () => void; onDone: (next: AfterSales) => void }) {
  const t = useTranslations("orders.afterSales");
  const errorText = useErrorText();
  const closeRef = useDialogChrome(onClose);
  const lines = info.lines.filter((l) => l.returnable > 0);
  const [qty, setQty] = useState<Record<string, number>>(() => (lines.length === 1 ? { [lines[0].id]: lines[0].returnable } : {}));
  const [reason, setReason] = useState<string>("defective");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState("");

  const priceOf = (lineId: string) => {
    const line = order.lines.find((l) => l.id === lineId);
    return line ? Number(line.line_total.amount) / Math.max(line.quantity, 1) : 0;
  };
  const chosen = Object.entries(qty).filter(([, q]) => q > 0);
  const value = chosen.reduce((sum, [id, q]) => sum + priceOf(id) * q, 0);

  function change(id: string, delta: number, max: number) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(max, (prev[id] ?? 0) + delta)) }));
  }

  async function submit() {
    if (state === "sending" || chosen.length === 0) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.order_number}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment: comment.trim(), lines: chosen.map(([id, q]) => ({ order_line_item_id: id, quantity: q })) }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(errorText(body.error?.code));
        setState("idle");
        return;
      }
      setNumber(body.data.return_number);
      setState("done");
      onDone(body.data as AfterSales);
    } catch {
      setError(t("errors.generic"));
      setState("idle");
    }
  }

  return (
    <Shell title={t("returnTitle")} icon={<RotateCcw className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />} onClose={onClose} closeRef={closeRef}>
      {state === "done" ? (
        <Success title={t("returnSentTitle", { number })} text={t("returnSentText")} onClose={onClose} />
      ) : (
        <>
          <p className="mt-3 text-sm text-ink-muted">{t("returnText")}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("whichItems")}</p>
          <ul className="mt-2 divide-y divide-border/70 rounded-2xl border border-border/70">
            {lines.map((l) => {
              const d = displays[l.product_variant_id];
              const q = qty[l.id] ?? 0;
              return (
                <li key={l.id} className="flex items-center gap-3 p-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-surface-2">
                    <ProductMediaImage src={d?.image ?? null} size="small" alt={d?.productName ?? ""} fit="contain" padding="p-1.5" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-ink">{d?.productName ?? t("item")}</p>
                    <p className="text-xs text-ink-soft">{d?.variantLabel ? `${d.variantLabel} · ` : ""}{t("ofReturnable", { count: l.returnable })}</p>
                  </div>
                  <div className="flex items-center gap-1" role="group" aria-label={t("quantity")}>
                    <button type="button" onClick={() => change(l.id, -1, l.returnable)} disabled={q === 0} aria-label={t("less")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink transition-colors hover:border-primary disabled:opacity-40">
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">{q}</span>
                    <button type="button" onClick={() => change(l.id, 1, l.returnable)} disabled={q >= l.returnable} aria-label={t("more")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink transition-colors hover:border-primary disabled:opacity-40">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("why")}</legend>
            <div className="flex flex-wrap gap-2">
              {info.reasons.return.map((r) => (
                <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${reason === r ? "border-primary bg-primary text-white" : "border-border text-ink-muted hover:border-primary hover:text-ink"}`}>
                  {t(`returnReason.${r}` as "returnReason.other")}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink-soft" htmlFor="return-comment">{t("commentLabel")}</label>
          <textarea id="return-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("returnCommentPlaceholder")} className="mt-1.5 w-full rounded-2xl border border-border bg-surface-2/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary" />
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2/60 px-4 py-3 text-sm">
            <span className="text-ink-muted">{t("returnValue")}</span>
            <span className="font-bold tabular-nums text-ink">{formatMoney(value, order.currency)}</span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.2} aria-hidden="true" />
            {t("returnHowItWorks")}
          </p>
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>{t("back")}</Button>
            <Button type="button" onClick={submit} disabled={state === "sending" || chosen.length === 0}>
              {state === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
              {t("sendReturn")}
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}
