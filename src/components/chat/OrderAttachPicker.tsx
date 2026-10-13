"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Package, ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import { formatMoney, orderTotal } from "@/lib/account-insights";
import { formatDate } from "@/lib/dates";

const RECENT_LIMIT = 6;

/** Composer button: pick one of the customer's recent orders to reference ("Order #ORD-…") in the message being written. Orders load on first open. */
export default function OrderAttachPicker({ onPick, disabled }: { onPick: (orderNumber: string) => void; disabled?: boolean }) {
  const t = useTranslations("account.chatPage");
  const tOrders = useTranslations("orders");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || orders || failed) return;
    let cancelled = false;
    fetch("/api/orders")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.success) setOrders((body.data as Order[]).slice(0, RECENT_LIMIT));
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, orders, failed]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={t("attachOrder")}
        title={t("attachOrder")}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <ReceiptText className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div className="nz-glass-strong animate-nz-fade-in absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl">
          <p className="border-b border-border/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("attachOrderTitle")}</p>
          {!orders && !failed ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="h-5 w-5 animate-spin text-ink-soft" aria-hidden="true" />
            </div>
          ) : !orders || orders.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-ink-muted">{t("attachOrderEmpty")}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(o.order_number);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary-soft"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
                      <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">#{o.order_number}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {o.placed_at ? formatDate(o.placed_at, locale, "date") : ""} · {tOrders(`status.${o.status}` as "status.draft")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-ink">{formatMoney(orderTotal(o), o.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
