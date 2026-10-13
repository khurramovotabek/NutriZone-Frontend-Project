"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Printer, RotateCcw } from "lucide-react";
import { money } from "./api";
import { loadPrinterSettings, printReceipt, receiptPath, savePrinterSettings, type PaperWidth } from "./printer";
import type { PosSale } from "./types";
import { useBrand } from "@/components/BrandContext";

function stamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Row({ k, v, bold = false }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{k}</span>
      <span className="text-right tabular-nums">{v}</span>
    </div>
  );
}

function useQr(token: string | null) {
  const [qr, setQr] = useState<{ src: string; url: string } | null>(null);
  useEffect(() => {
    if (!token) return;
    const url = `${window.location.origin}${receiptPath(token)}`;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: "M" }).then((src) => {
      if (!cancelled) setQr({ src, url });
    });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return qr;
}

/** On-screen preview of the slip (the printed one is the same e-receipt page, sized for the roll). */
export function Receipt({ sale }: { sale: PosSale }) {
  const brand = useBrand();
  const t = useTranslations("storePos");
  const coins = Number(sale.coins_redeemed || 0);
  const discount = Number(sale.discount || 0);
  const qr = useQr(sale.receipt_token);
  const cash = sale.payment_method === "cash" || sale.payments.some((p) => p.method === "cash");
  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl bg-white font-mono text-[12px] leading-relaxed text-neutral-900 shadow-inner">
      <div className="bg-neutral-900 px-5 py-4 text-center text-white">
        <p className="text-base font-black tracking-[0.3em]">{brand.name.toUpperCase()}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-wide">{sale.kassa || sale.store.name}</p>
        {sale.store.address && <p className="text-[11px] opacity-70">{sale.store.address}</p>}
        {sale.store.phone && <p className="text-[11px] opacity-70">{sale.store.phone}</p>}
      </div>
      <div className="px-5 py-4">
        <Row k={t("receiptNo")} v={sale.receipt_number ?? sale.number} bold />
        <Row k={t("date")} v={stamp(sale.completed_at ?? sale.created_at)} />
        {sale.kassa && <Row k={t("session.kassa")} v={sale.kassa} />}
        {sale.shift ? <Row k={t("session.shift")} v={`№${sale.shift}`} /> : null}
        {sale.cashier && <Row k={t("session.cashier")} v={sale.cashier} bold />}
        {sale.customer && <Row k={t("customerLabel")} v={sale.customer.full_name || sale.customer.phone_number} />}
        <div className="my-2 border-t border-dashed border-neutral-400" />
        {sale.items.map((line) => (
          <div key={line.id} className="mb-1.5">
            <p className="font-semibold leading-snug">
              {line.name}
              {line.variant_label ? ` · ${line.variant_label}` : ""}
            </p>
            <div className="flex justify-between text-neutral-600">
              <span className="tabular-nums">
                {line.quantity} × {money(line.unit_price)}
                {(line.refunded_quantity ?? 0) > 0 && <span className="text-red-600"> (−{line.refunded_quantity})</span>}
              </span>
              <span className="font-semibold text-neutral-900 tabular-nums">{money(line.line_total)}</span>
            </div>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-neutral-400" />
        <Row k={t("checkout.subtotal")} v={money(sale.total)} />
        {discount > 0 && <Row k={t("checkout.discount")} v={`−${money(discount)}`} />}
        {coins > 0 && <Row k={t("checkout.coinsLine")} v={`−${money(coins)}`} />}
        <div className="mt-1 flex justify-between border-y border-neutral-900 py-1.5 text-[15px] font-black">
          <span>{t("total")}</span>
          <span className="tabular-nums">
            {money(sale.amount_due)} {t("som")}
          </span>
        </div>
        {sale.payments.length > 1 ? (
          sale.payments.map((p) => <Row key={p.method} k={t(`methods.${p.method}`)} v={money(p.amount)} />)
        ) : (
          sale.payment_method && <Row k={t("method")} v={t(`methods.${sale.payment_method}`)} />
        )}
        {cash && sale.amount_tendered && <Row k={t("received")} v={money(sale.amount_tendered)} />}
        {cash && sale.change && Number(sale.change) > 0 && <Row k={t("changeDue")} v={money(sale.change)} bold />}
        {sale.customer && sale.coins_earned > 0 && <Row k="Cashback" v={`+${money(sale.coins_earned)} coin`} bold />}
        {sale.refunds.length > 0 && (
          <div className="mt-2 border-t border-dashed border-neutral-400 pt-2">
            {sale.refunds.map((r) => (
              <Row key={r.number} k={`${t("return.slip")} ${r.number.split("-").pop()} · ${r.items} ${t("return.pcs")}`} v={`−${money(r.value)}`} />
            ))}
            <Row k={t("return.netTotal")} v={`${money(Number(sale.amount_due) + Number(sale.coins_redeemed) - Number(sale.refunded_value))} ${t("som")}`} bold />
          </div>
        )}
        {sale.status === "refunded" && <p className="mt-2 text-center font-bold uppercase">*** {t("statusRefunded")} ***</p>}
        {qr && (
          <div className="mt-3 flex flex-col items-center gap-1 border-t border-dashed border-neutral-400 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL QR code, nothing to optimise */}
            <img src={qr.src} alt={t("printer.qrAlt")} className="h-28 w-28" />
            <p className="text-[10px] text-neutral-500">{t("printer.scanHint")}</p>
            <p className="break-all text-center text-[10px] text-neutral-700">{qr.url.replace(/^https?:\/\//, "")}</p>
          </div>
        )}
        <p className="mt-2 text-center text-[11px] text-neutral-600">{t("thanks")}</p>
      </div>
    </div>
  );
}

type PrintState = "idle" | "printing" | "printed" | "failed";

export default function ReceiptDialog({ sale, onNewSale, onClose, reprint = false }: { sale: PosSale; onNewSale?: () => void; onClose: () => void; reprint?: boolean }) {
  const t = useTranslations("storePos");
  // Only ever rendered in the browser (after a sale / a click), so storage is readable up front.
  const [width, setWidth] = useState<PaperWidth>(() => loadPrinterSettings().width);
  const [state, setState] = useState<PrintState>("idle");

  const print = useCallback(
    async (w: PaperWidth) => {
      if (!sale.receipt_token) return;
      setState("printing");
      setState(await printReceipt(sale.receipt_token, w));
    },
    [sale.receipt_token],
  );

  // A fresh sale prints itself (if auto-print is on); a reprint waits for the button.
  useEffect(() => {
    const settings = loadPrinterSettings();
    if (reprint || !settings.auto) return;
    const timer = setTimeout(() => print(settings.width), 0);
    return () => clearTimeout(timer);
  }, [print, reprint]);

  function pickWidth(w: PaperWidth) {
    setWidth(w);
    savePrinterSettings({ ...loadPrinterSettings(), width: w });
  }

  // rendered on <body>: glass (backdrop-filter) ancestors would otherwise trap this fixed overlay inside their card
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="receipt-title" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="nz-glass-strong animate-nz-sheet-up grid max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl md:grid-cols-[1fr_1fr]">
        <div className="bg-surface-2/40 p-5">
          <Receipt sale={sale} />
        </div>

        <div className="flex flex-col p-6">
          {reprint ? (
            <h2 id="receipt-title" className="text-lg font-bold text-ink">
              {t("receipt")} {sale.receipt_number ?? sale.number}
            </h2>
          ) : (
            <div className="text-center">
              <div className="nz-auth-check mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h2 id="receipt-title" className="mt-3 text-xl font-extrabold text-ink">
                {t("paidTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted tabular-nums">
                {money(sale.amount_due)} {t("som")} · {sale.payment_method ? t(`methods.${sale.payment_method}`) : ""}
              </p>
              {sale.payment_method === "cash" && sale.change && Number(sale.change) > 0 && (
                <div className="mx-auto mt-4 max-w-xs rounded-2xl bg-emerald-500/12 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t("giveChange")}</p>
                  <p className="text-3xl font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {money(sale.change)} <span className="text-sm">{t("som")}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* printer */}
          <div className="mt-5 rounded-2xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-bold text-ink">
                <Printer className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
                {t("printer.printer")}
              </span>
              <div className="inline-flex rounded-full bg-surface-2/70 p-0.5" role="radiogroup" aria-label={t("printer.paper")}>
                {([58, 80] as const).map((w) => (
                  <button key={w} type="button" role="radio" aria-checked={width === w} onClick={() => pickWidth(w)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${width === w ? "bg-surface text-ink shadow" : "text-ink-muted"}`}>
                    {w} mm
                  </button>
                ))}
              </div>
            </div>
            <p role="status" aria-live="polite" className={`mt-3 flex items-center gap-2 text-xs font-medium ${state === "failed" ? "text-red-600" : state === "printed" ? "text-emerald-600 dark:text-emerald-400" : "text-ink-muted"}`}>
              {state === "printing" && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
              {state === "printed" && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
              {state === "failed" && <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />}
              {t(`printer.state.${state}`)}
            </p>
            <button type="button" onClick={() => print(width)} disabled={state === "printing" || !sale.receipt_token} className="nz-liquid-chip mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
              <Printer className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {state === "idle" ? t("printer.print") : t("printer.again")}
            </button>
          </div>

          {sale.receipt_token && (
            <a href={receiptPath(sale.receipt_token)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary hover:bg-primary-soft">
              <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("printer.openEReceipt")}
            </a>
          )}

          <div className="mt-auto pt-4">
            {onNewSale ? (
              <button type="button" onClick={onNewSale} autoFocus className="nz-cta inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold">
                <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {t("newSale")}
                <kbd className="rounded bg-white/20 px-1 font-mono text-[10px]">F9</kbd>
              </button>
            ) : (
              <button type="button" onClick={onClose} className="nz-cta w-full rounded-2xl py-3.5 text-sm font-bold">
                {t("close")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
