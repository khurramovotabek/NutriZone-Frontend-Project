"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CreditCard, Loader2, Minus, Package, Plus, Sparkles, Undo2, X } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { money, pos } from "./api";
import type { PosError, PosRefundPreview, PosSale } from "./types";

const METHOD_ICON: Record<string, typeof Banknote> = { cash: Banknote, uzcard: CreditCard, humo: CreditCard };

/**
 * Return (vozvrat) of a whole sale or just some units. The cashier picks what
 * comes back; the server computes -- and the dialog previews live -- the value,
 * how much goes back in cash (out of the drawer), on the card, as coins, and the
 * cashback taken back. Nothing changes until "Return" is confirmed.
 */
export default function RefundDialog({
  sale,
  onClose,
  onDone,
  explain,
}: {
  sale: PosSale;
  onClose: () => void;
  onDone: (sale: PosSale) => void;
  explain: (e: PosError) => string;
}) {
  const t = useTranslations("storePos");
  const lines = useMemo(() => sale.items.map((l) => ({ ...l, left: l.quantity - (l.refunded_quantity ?? 0) })).filter((l) => l.left > 0), [sale.items]);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(lines.map((l) => [l.id, l.left])));
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<PosRefundPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => Object.entries(qty).filter(([, q]) => q > 0).map(([line_id, quantity]) => ({ line_id, quantity })), [qty]);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  // Live preview from the server (the only place the money split is computed).
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      pos<{ preview: PosRefundPreview }>(`sales/${sale.id}/refund`, { method: "POST", body: { items, preview: true } }).then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setPreview(res.data.preview);
          setError(null);
        } else setError(explain(res.error));
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [explain, items, sale.id]);

  async function confirm() {
    if (!items.length || busy) return;
    setBusy(true);
    const res = await pos<PosSale>(`sales/${sale.id}/refund`, { method: "POST", body: { items, reason: reason.trim() } });
    setBusy(false);
    if (res.ok) onDone(res.data);
    else setError(explain(res.error));
  }

  const shown = items.length ? preview : null;

  // rendered on <body>: glass (backdrop-filter) ancestors would otherwise trap this fixed overlay inside their card
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="refund-title" onClick={busy ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="nz-glass-strong animate-nz-sheet-up flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 id="refund-title" className="flex items-center gap-2 text-lg font-extrabold text-ink">
              <Undo2 className="h-5 w-5 text-red-500" strokeWidth={2.2} aria-hidden="true" />
              {t("return.title")}
            </h2>
            <p className="text-[11px] text-ink-soft tabular-nums">
              {sale.receipt_number ?? sale.number} · {sale.customer?.full_name ?? t("history.walkIn")}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl p-2 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t("cancel")}>
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="grid flex-1 overflow-y-auto overflow-x-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-border/60 p-5 md:border-b-0 md:border-r">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-ink-soft">{t("return.pick")}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => setQty(Object.fromEntries(lines.map((l) => [l.id, l.left])))} className="rounded-lg px-2 py-1 font-semibold text-primary hover:bg-primary-soft">
                  {t("return.all")}
                </button>
                <button type="button" onClick={() => setQty(Object.fromEntries(lines.map((l) => [l.id, 0])))} className="rounded-lg px-2 py-1 font-semibold text-ink-muted hover:bg-surface-2">
                  {t("return.none")}
                </button>
              </span>
            </div>
            {lines.map((l) => {
              const q = qty[l.id] ?? 0;
              return (
                <div key={l.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${q > 0 ? "border-red-500/40 bg-red-500/5" : "border-border/60"}`}>
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                    <MediaImage src={l.image_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.5} />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                    <p className="text-[11px] text-ink-soft tabular-nums">
                      {money(l.unit_price)} · {t("return.sold", { n: l.quantity })}
                      {(l.refunded_quantity ?? 0) > 0 && <span className="text-red-500"> · {t("return.already", { n: l.refunded_quantity ?? 0 })}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty({ ...qty, [l.id]: Math.max(0, q - 1) })} disabled={q <= 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted hover:border-primary disabled:opacity-40" aria-label={t("decrease")}>
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="w-10 text-center text-sm font-bold tabular-nums text-ink">
                      {q}
                      <span className="text-[10px] font-medium text-ink-soft">/{l.left}</span>
                    </span>
                    <button type="button" onClick={() => setQty({ ...qty, [l.id]: Math.min(l.left, q + 1) })} disabled={q >= l.left} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted hover:border-primary disabled:opacity-40" aria-label={t("increase")}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
            <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 255))} placeholder={t("return.reason")} aria-label={t("return.reason")} className="nz-glass-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div className="flex flex-col gap-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("return.giveBack")}</p>
            {!items.length ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-muted">{t("return.pickHint")}</p>
            ) : !shown ? (
              <div className="nz-liquid h-40 animate-pulse rounded-2xl" aria-hidden="true" />
            ) : (
              <>
                <div className="rounded-2xl bg-red-500/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">{t("return.value", { n: count })}</p>
                  <p className="mt-1 whitespace-nowrap text-3xl font-extrabold text-ink tabular-nums">
                    {money(shown.value)} <span className="text-sm font-semibold text-ink-soft">{t("som")}</span>
                  </p>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(shown.split).map(([m, a]) => {
                    const Icon = METHOD_ICON[m] ?? CreditCard;
                    return (
                      <li key={m} className="flex items-center justify-between rounded-xl bg-surface-2/50 px-3 py-2">
                        <span className="flex items-center gap-2 text-ink-muted">
                          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                          {m === "cash" ? t("return.cashOut") : t("return.cardBack", { method: t(`methods.${m}`) })}
                        </span>
                        <b className="whitespace-nowrap tabular-nums text-ink">{money(a)}</b>
                      </li>
                    );
                  })}
                  {Number(shown.coins) > 0 && (
                    <li className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-ink-muted">
                        <CoinIcon size={16} />
                        {t("return.coinsBack")}
                      </span>
                      <b className="tabular-nums text-amber-600 dark:text-amber-400">+{money(shown.coins)}</b>
                    </li>
                  )}
                  {shown.cashback > 0 && (
                    <li className="flex items-center justify-between rounded-xl px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        {t("return.cashbackBack")}
                      </span>
                      <span className="tabular-nums text-ink-muted">−{money(shown.cashback)}</span>
                    </li>
                  )}
                </ul>
                {shown.final && <p className="text-[11px] text-ink-soft">{t("return.finalNote")}</p>}
              </>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
            <button type="button" onClick={confirm} disabled={busy || !items.length || !shown} className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-red-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Undo2 className="h-4 w-4" strokeWidth={2.2} />}
              {shown ? t("return.confirm", { amount: money(shown.value) }) : t("refund")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
