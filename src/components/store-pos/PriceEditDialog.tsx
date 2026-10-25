"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Tag, X } from "lucide-react";
import { money } from "./api";
import type { PosLine } from "./types";

/**
 * Sell one basket line at another unit price (a negotiated / manager price). The original list price stays visible;
 * every change is journaled for the owner (Dashboard → POS → Narx o'zgarishlari). Setting the list price back undoes it.
 */
export default function PriceEditDialog({
  line,
  onSave,
  onClose,
}: {
  line: PosLine;
  onSave: (price: number, reason: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useTranslations("storePos.priceEdit");
  const base = Number(line.list_price ?? line.unit_price);
  const [value, setValue] = useState(String(Math.round(Number(line.unit_price))));
  const [reason, setReason] = useState(line.price_reason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = Number(value.replace(/\s/g, "")) || 0;
  const diff = (base - price) * line.quantity;

  async function save(next: number, why: string) {
    if (!(next > 0)) {
      setError(t("invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await onSave(next, why);
    setBusy(false);
    if (failure) setError(failure);
    else onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="price-title" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void save(price, reason);
        }}
        className="nz-glass-strong animate-nz-sheet-up w-full max-w-md rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 id="price-title" className="flex min-w-0 items-center gap-2 text-lg font-bold text-ink">
            <Tag className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{t("title")}</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t("cancel")}>
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="truncate text-sm font-semibold text-ink">{line.name}</p>
            <p className="text-xs text-ink-soft">
              {line.variant_label ? `${line.variant_label} · ` : ""}
              {t("listPrice")}: <b className="tabular-nums text-ink">{money(base)}</b> · {line.quantity} {t("pcs")}
            </p>
          </div>
          <label className="block text-sm font-medium text-ink">
            {t("newPrice")}
            <input
              autoFocus
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d\s]/g, ""))}
              onFocus={(e) => e.currentTarget.select()}
              className="nz-glass-input mt-1.5 w-full rounded-2xl px-4 py-3 text-2xl font-bold tabular-nums"
            />
          </label>
          {price > 0 && price !== base && (
            <p className={`text-sm font-semibold tabular-nums ${diff > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {diff > 0 ? t("discount", { amount: money(diff) }) : t("markup", { amount: money(-diff) })}
            </p>
          )}
          <label className="block text-sm font-medium text-ink">
            {t("reason")}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("reasonHint")} className="nz-glass-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-base sm:text-sm" />
          </label>
          <p className="text-xs text-ink-soft">{t("journalNote")}</p>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          {line.list_price && (
            <button type="button" disabled={busy} onClick={() => void save(base, "")} className="mr-auto rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink">
              {t("reset")}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-surface-2">{t("cancel")}</button>
          <button type="submit" disabled={busy} className="nz-cta inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t("save")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
