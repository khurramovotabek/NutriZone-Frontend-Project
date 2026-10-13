"use client";

import { forwardRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Barcode, CheckCircle2, CircleAlert, Package, RotateCcw, Tag } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import { money } from "./api";
import type { PosCatalogItem } from "./types";

export type LastScan =
  | { kind: "added"; item: PosCatalogItem; qty: number; inBasket: number }
  | { kind: "price"; item: PosCatalogItem }
  | { kind: "error"; code: string; message: string };

/**
 * The till's scan-to-cart field, docked above the basket: a scanner (keyboard wedge) or typed barcode / SKU goes
 * straight into the basket -- "× N" first for a box of N, "Narx" mode to check price and stock without adding.
 * The last scan stays visible with an undo, so a double scan is fixed in one tap. Search lives on the left.
 */
const ScanToCart = forwardRef<HTMLInputElement, {
  busy: boolean;
  last: LastScan | null;
  priceMode: boolean;
  onPriceMode: (on: boolean) => void;
  onScan: (code: string, quantity: number) => void;
  onUndo: () => void;
  onAdjustLast: (delta: number) => void;
}>(function ScanToCart({ busy, last, priceMode, onPriceMode, onScan, onUndo, onAdjustLast }, ref) {
  const t = useTranslations("storePos.scanner");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(1);

  function submit() {
    const value = code.trim();
    if (!value || busy) return;
    onScan(value, priceMode ? 1 : qty);
    setCode("");
    setQty(1); // "× N" is for the next scan only
  }

  return (
    <div className={`border-b border-border/60 p-3 ${priceMode ? "bg-amber-500/8" : "bg-primary/5"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          <Barcode className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} aria-hidden="true" />
          {priceMode ? t("titlePrice") : t("title")}
        </p>
        <div className="inline-flex rounded-full bg-surface-2/80 p-0.5 text-[11px] font-bold" role="radiogroup" aria-label={t("mode")}>
          <button type="button" role="radio" aria-checked={!priceMode} onClick={() => onPriceMode(false)} className={`rounded-full px-2.5 py-1 ${!priceMode ? "bg-primary text-primary-contrast shadow" : "text-ink-muted"}`}>{t("modeAdd")}</button>
          <button type="button" role="radio" aria-checked={priceMode} onClick={() => onPriceMode(true)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${priceMode ? "bg-amber-500 text-white shadow" : "text-ink-muted"}`}><Tag className="h-3 w-3" aria-hidden="true" />{t("modePrice")}</button>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className={`flex items-center gap-2 rounded-2xl border-2 bg-surface px-2.5 py-1.5 transition-colors focus-within:shadow-lg ${priceMode ? "border-amber-400 focus-within:border-amber-500" : "border-primary/40 focus-within:border-primary"}`}>
        <Barcode className={`h-6 w-6 shrink-0 ${priceMode ? "text-amber-500" : "text-primary"}`} aria-hidden="true" />
        <input
          ref={ref}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            // two fields and no submit button: browsers don't submit on Enter, so the scanner's Enter is handled here
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
              return;
            }
            // with an empty field, + / − change the last scanned line (a quick fix without the mouse)
            if (!code && (e.key === "+" || e.key === "-")) {
              e.preventDefault();
              onAdjustLast(e.key === "+" ? 1 : -1);
            }
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder={priceMode ? t("placeholderPrice") : t("placeholder")}
          aria-label={priceMode ? t("placeholderPrice") : t("placeholder")}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base font-bold tracking-wide text-ink outline-none placeholder:text-sm placeholder:font-medium placeholder:text-ink-soft"
        />
        {!priceMode && (
          <label className="flex shrink-0 items-center rounded-xl border border-border bg-surface-2/60 pl-2" title={t("qtyHint")}>
            <span className="text-xs font-black text-ink-soft">×</span>
            <input
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(Math.min(999, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              aria-label={t("qtyHint")}
              className="h-8 w-11 bg-transparent text-center text-sm font-bold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </label>
        )}
      </form>

      {last && (
        <div role="status" aria-live="polite" className={`mt-2 flex items-center gap-2.5 rounded-2xl p-2 ${last.kind === "error" ? "bg-red-500/10" : last.kind === "price" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
          {last.kind === "error" ? (
            <>
              <CircleAlert className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-xs font-semibold text-red-700 dark:text-red-300"><span className="font-mono">{last.code}</span> — {last.message}</p>
            </>
          ) : (
            <>
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                <MediaImage src={last.item.image_url} alt="" fit="contain" padding="p-1" sizes="44px" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" aria-hidden="true" />} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{last.item.name}</p>
                <p className="text-[11px] text-ink-muted tabular-nums">
                  {last.item.price ? `${money(last.item.price)} so'm` : "—"} · {t("stock", { count: last.item.stock })}
                  {last.item.batch ? ` · LOT ${last.item.batch.number || last.item.batch.expiry || ""}` : ""}
                </p>
              </div>
              {last.kind === "added" ? (
                <div className="flex shrink-0 items-center gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />+{last.qty} → {last.inBasket}</span>
                  <button type="button" onClick={onUndo} disabled={busy} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink" aria-label={t("undo", { n: last.qty })} title={t("undo", { n: last.qty })}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${last.item.sellable ? "bg-amber-500 text-white" : "bg-red-600 text-white"}`}>{last.item.sellable ? t("priceOnly") : t("notSellable")}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default ScanToCart;
