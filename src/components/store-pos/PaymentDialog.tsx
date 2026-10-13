"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, Banknote, CreditCard, Delete, Loader2, Package, ShieldCheck, Smartphone, Sparkles, Split, Wallet, X } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { money, pos } from "./api";
import type { PaymentCode, PosConfig, PosError, PosSale } from "./types";

const METHOD_STYLE: Record<PaymentCode, { icon: typeof Banknote; gradient: string }> = {
  cash: { icon: Banknote, gradient: "from-emerald-500 to-emerald-700" },
  uzcard: { icon: CreditCard, gradient: "from-sky-500 to-blue-800" },
  humo: { icon: CreditCard, gradient: "from-teal-500 to-emerald-800" },
  card: { icon: CreditCard, gradient: "from-slate-600 to-slate-800" },
  click: { icon: Smartphone, gradient: "from-sky-400 to-blue-600" },
  payme: { icon: Wallet, gradient: "from-cyan-500 to-teal-600" },
  uzum: { icon: Smartphone, gradient: "from-violet-500 to-fuchsia-600" },
  mixed: { icon: Split, gradient: "from-indigo-500 to-violet-700" },
};

const CARD_CODES = ["uzcard", "humo"] as const;

const stopEnter = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") e.preventDefault();
};

/**
 * Checkout. Order → optional discount (capped, with a reason) → the buyer's coins
 * (capped by the programme) → the tender: cash with keypad/quick amounts and
 * change, or Uzcard / Humo on the store's bank terminal (exactly the amount due).
 * The server re-validates every figure on confirm; the sale is completed once,
 * even if the confirm is tapped twice or the network drops mid-request.
 */
export default function PaymentDialog({
  sale,
  config,
  onClose,
  onPaid,
  onError,
}: {
  sale: PosSale;
  config: PosConfig;
  onClose: () => void;
  onPaid: (sale: PosSale) => void;
  onError: (e: PosError) => void;
}) {
  const t = useTranslations("storePos");
  const methods = config.payment_methods;
  const total = Number(sale.total);
  const maxPercent = Number(config.max_discount_percent || 0);
  const maxDiscount = Math.floor((total * maxPercent) / 100);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountRaw, setDiscountRaw] = useState("");
  const [reason, setReason] = useState("");
  const discount = discountOpen ? Math.min(maxDiscount, Math.max(0, Math.round(Number(discountRaw) || 0))) : 0;
  const discountTooHigh = discountOpen && (Number(discountRaw) || 0) > maxDiscount;
  const needsReason = discount > 0 && !reason.trim();

  const redeem = sale.customer?.redeem;
  const afterDiscount = total - discount;
  const maxCoins = redeem ? Math.max(0, Math.min(redeem.max_coins, Math.floor((afterDiscount * redeem.max_percent) / 100))) : 0;
  const canUseCoins = Boolean(redeem?.enabled && maxCoins >= (redeem?.min_coins ?? 0) && maxCoins > 0);
  const [coinsWanted, setCoinsWanted] = useState(0);
  const coins = canUseCoins ? Math.min(coinsWanted, maxCoins) : 0;
  const due = afterDiscount - coins;

  const [method, setMethod] = useState<PaymentCode>(methods.find((m) => m.live)?.code ?? "cash");
  // Split payment: the card parts are typed in, cash covers whatever is left.
  const [split, setSplit] = useState(false);
  const [cardParts, setCardParts] = useState<Record<string, string>>({ uzcard: "", humo: "" });
  const liveCards = CARD_CODES.filter((c) => methods.some((m) => m.code === c && m.live));
  const cardTotal = split ? liveCards.reduce((n, c) => n + (Number(cardParts[c]) || 0), 0) : 0;
  const cardsTooMuch = split && cardTotal > due;
  const isCard = !split && (method === "uzcard" || method === "humo");
  const cashPart = split ? Math.max(0, due - cardTotal) : isCard ? 0 : due;
  const [received, setReceived] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const tendered = received === "" ? cashPart : Number(received) || 0;
  const change = tendered - cashPart;
  const short = cashPart > 0 && tendered < cashPart;
  const cashback = sale.customer?.tier ? Math.floor((due * Number(sale.customer.tier.percent)) / 100) : 0;
  const blocked = busy || short || needsReason || discountTooHigh || cardsTooMuch || (split && cardTotal === 0);

  const quick = useMemo(() => {
    const set = new Set<number>();
    for (const step of [1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000]) {
      const up = Math.ceil(cashPart / step) * step;
      if (up > cashPart) set.add(up);
    }
    return [...set].sort((a, b) => a - b).slice(0, 4);
  }, [cashPart]);

  function key(k: string) {
    setReceived((prev) => {
      if (k === "del") return prev.slice(0, -1);
      const next = (prev + k).replace(/^0+/, "");
      return next.length > 12 ? prev : next;
    });
  }

  async function confirm(e?: React.FormEvent) {
    e?.preventDefault();
    if (blocked) return;
    setBusy(true);
    const payments = split
      ? [...liveCards.map((c) => ({ method: c, amount: Number(cardParts[c]) || 0 })), { method: "cash", amount: cashPart }].filter((p) => p.amount > 0)
      : undefined;
    const res = await pos<PosSale>(`sales/${sale.id}/complete`, {
      method: "POST",
      body: { payment_method: method, amount_tendered: cashPart > 0 ? tendered : undefined, payments, coins, discount, discount_reason: reason.trim() },
    });
    if (res.ok) {
      onPaid(res.data);
      return;
    }
    if (res.error.code === "NETWORK") {
      // The request may have reached the server before the connection dropped:
      // ask for the sale's real state instead of letting the cashier charge twice.
      const check = await pos<PosSale>(`sales/${sale.id}`);
      if (check.ok && check.data.status === "completed") {
        onPaid(check.data);
        return;
      }
    }
    setBusy(false);
    onError(res.error);
  }

  const coinFill = redeem && maxCoins > redeem.min_coins ? ((coins - redeem.min_coins) / (maxCoins - redeem.min_coins)) * 100 : 100;
  const live = methods.filter((m) => m.live);
  const soon = methods.filter((m) => !m.live);

  // rendered on <body>: glass (backdrop-filter) ancestors would otherwise trap this fixed overlay inside their card
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={busy ? undefined : onClose}>
      <form onSubmit={confirm} onClick={(e) => e.stopPropagation()} className="nz-glass-strong animate-nz-sheet-up flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 id="pay-title" className="text-lg font-extrabold text-ink">
              {t("checkout.title")}
            </h2>
            <p className="text-[11px] text-ink-soft tabular-nums">
              {sale.number} · {t("itemsCount", { count: sale.item_count })}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl p-2 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t("cancel")}>
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="grid flex-1 overflow-y-auto overflow-x-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* ---- left: order, discount, customer + coins, summary */}
          <div className="space-y-4 border-b border-border/60 p-6 md:border-b-0 md:border-r">
            <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {sale.items.map((line) => (
                <li key={line.id} className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                    <MediaImage src={line.image_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.5} />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{line.name}</p>
                    <p className="text-[11px] text-ink-soft tabular-nums">
                      {line.quantity} × {money(line.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums">{money(line.line_total)}</span>
                </li>
              ))}
            </ul>

            {/* discount */}
            {maxDiscount > 0 &&
              (discountOpen ? (
                <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <BadgePercent className="h-4 w-4 text-fuchsia-500" strokeWidth={2} aria-hidden="true" />
                      {t("checkout.discount")}
                    </span>
                    <button type="button" onClick={() => (setDiscountOpen(false), setDiscountRaw(""), setReason(""))} className="text-[11px] font-semibold text-ink-soft hover:text-red-600">
                      {t("checkout.removeDiscount")}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={discountRaw}
                      onKeyDown={stopEnter}
                      onChange={(e) => setDiscountRaw(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="0"
                      aria-label={t("checkout.discountAmount")}
                      className="nz-glass-input w-32 rounded-xl px-3 py-2 text-right text-sm font-bold tabular-nums"
                    />
                    {[5, 10, maxPercent]
                      .filter((p, i, arr) => p > 0 && p <= maxPercent && arr.indexOf(p) === i)
                      .map((p) => (
                        <button key={p} type="button" onClick={() => setDiscountRaw(String(Math.floor((total * p) / 100)))} className="nz-liquid-chip rounded-lg px-2.5 py-1.5 text-[11px] font-bold">
                          {p}%
                        </button>
                      ))}
                  </div>
                  <input
                    value={reason}
                    onKeyDown={stopEnter}
                    onChange={(e) => setReason(e.target.value.slice(0, 120))}
                    placeholder={t("checkout.discountReason")}
                    aria-label={t("checkout.discountReason")}
                    className={`nz-glass-input mt-2 w-full rounded-xl px-3 py-2 text-sm ${needsReason ? "ring-1 ring-red-500/50" : ""}`}
                  />
                  <p className={`mt-1.5 text-[11px] ${discountTooHigh ? "font-semibold text-red-600" : "text-ink-soft"}`}>{t("checkout.discountCap", { percent: maxPercent, max: money(maxDiscount) })}</p>
                </div>
              ) : (
                <button type="button" onClick={() => setDiscountOpen(true)} className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-600">
                  <BadgePercent className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  {t("checkout.addDiscount")}
                </button>
              ))}

            {/* customer + coins */}
            {sale.customer ? (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
                <div className="flex items-center gap-3">
                  {sale.customer.tier && <TierBadge icon={sale.customer.tier.icon} color={sale.customer.tier.color} size={40} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{sale.customer.full_name || sale.customer.phone_number}</p>
                    <p className="text-[11px] text-ink-muted">{sale.customer.tier ? `${sale.customer.tier.name} · ${sale.customer.tier.percent}%` : t("checkout.noTier")}</p>
                  </div>
                  <p className="flex items-center gap-1 text-sm font-extrabold text-ink tabular-nums">
                    <CoinIcon size={18} />
                    {money(sale.customer.balance)}
                  </p>
                </div>

                {canUseCoins && redeem ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">{t("checkout.payWithCoins")}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={coins > 0}
                        onClick={() => setCoinsWanted(coins > 0 ? 0 : maxCoins)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${coins > 0 ? "bg-amber-500" : "bg-surface-3"}`}
                        aria-label={t("checkout.payWithCoins")}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${coins > 0 ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {coins > 0 && (
                      <>
                        {maxCoins > redeem.min_coins && (
                          <input
                            type="range"
                            min={redeem.min_coins}
                            max={maxCoins}
                            step={maxCoins >= 10_000 ? 1_000 : 100}
                            value={coins}
                            onChange={(e) => setCoinsWanted(Number(e.target.value))}
                            className="nz-range mt-3 w-full"
                            style={{ "--fill": `${coinFill}%`, "--accent": "#e0a91b" } as React.CSSProperties}
                            aria-label={t("checkout.payWithCoins")}
                          />
                        )}
                        <p className="mt-1.5 flex justify-between text-[11px] text-ink-soft tabular-nums">
                          <span>{t("checkout.coinRule", { percent: redeem.max_percent })}</span>
                          <button type="button" onClick={() => setCoinsWanted(maxCoins)} className="font-bold text-amber-600 hover:underline dark:text-amber-400">
                            {t("checkout.max", { max: money(maxCoins) })}
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-ink-soft">{sale.customer.balance > 0 ? t("checkout.coinsBelowMin", { min: money(redeem?.min_coins ?? 1000) }) : t("checkout.noCoins")}</p>
                )}

                {cashback > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    {t("checkout.cashback", { coins: money(cashback) })}
                  </p>
                )}
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-2xl border border-dashed border-border p-3 text-xs text-ink-muted">
                <CoinIcon size={18} className="shrink-0" />
                {t("checkout.addCustomerHint")}
              </p>
            )}

            <div className="space-y-1.5 rounded-2xl bg-surface-2/50 p-4 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>{t("checkout.subtotal")}</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                  <span>{t("checkout.discount")}</span>
                  <span className="tabular-nums">−{money(discount)}</span>
                </div>
              )}
              {coins > 0 && (
                <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <CoinIcon size={14} />
                    {t("checkout.coinsLine")}
                  </span>
                  <span className="tabular-nums">−{money(coins)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
                <span className="font-bold text-ink">{t("checkout.due")}</span>
                <span className="text-2xl font-extrabold text-ink tabular-nums">
                  {money(due)} <span className="text-xs font-semibold text-ink-soft">{t("som")}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ---- right: payment */}
          <div className="flex flex-col gap-4 p-6">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("method")}</legend>
              <div className="grid grid-cols-3 gap-2">
                {live.map((m) => {
                  const style = METHOD_STYLE[m.code];
                  const Icon = style.icon;
                  const active = method === m.code;
                  return (
                    <button
                      key={m.code}
                      type="button"
                      aria-pressed={active && !split}
                      onClick={() => (setMethod(m.code), setSplit(false))}
                      className={`relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl p-3 text-left text-white shadow-lg transition-all bg-gradient-to-br ${style.gradient} ${active && !split ? "ring-2 ring-primary ring-offset-2 ring-offset-bg" : "opacity-70 hover:opacity-100"}`}
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" aria-hidden="true" />
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                      <span className="text-sm font-extrabold tracking-wide">{t(`methods.${m.code}`)}</span>
                      {active && !split && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-white shadow" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {liveCards.length > 0 && (
                <button
                  type="button"
                  aria-pressed={split}
                  onClick={() => setSplit((v) => !v)}
                  className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${split ? "border-indigo-500 bg-indigo-500/12 text-indigo-600 dark:text-indigo-300" : "border-dashed border-border text-ink-muted hover:border-indigo-500/60 hover:text-indigo-600"}`}
                >
                  <Split className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                  {t("checkout.splitToggle")}
                </button>
              )}
              {soon.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-soft">
                  {soon.map((m) => (
                    <span key={m.code} className="rounded-full border border-border px-2 py-0.5 font-semibold">
                      {t(`methods.${m.code}`)} · {t("soon")}
                    </span>
                  ))}
                </div>
              )}
            </fieldset>

            {split && (
              <div className="space-y-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                {liveCards.map((c) => (
                  <label key={c} className="flex items-center gap-3">
                    <span className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-black text-white ${METHOD_STYLE[c].gradient}`}>{t(`methods.${c}`).toUpperCase()}</span>
                    <input
                      inputMode="numeric"
                      value={cardParts[c]}
                      onKeyDown={stopEnter}
                      onChange={(e) => setCardParts({ ...cardParts, [c]: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="0"
                      aria-label={t(`methods.${c}`)}
                      className="nz-glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-right text-base font-bold tabular-nums"
                    />
                    <button type="button" onClick={() => setCardParts({ ...cardParts, [c]: String(Math.max(0, due - (cardTotal - (Number(cardParts[c]) || 0)))) })} className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300">
                      {t("checkout.rest")}
                    </button>
                  </label>
                ))}
                <div className="flex items-center justify-between border-t border-indigo-500/20 pt-2 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <Banknote className="h-4 w-4 text-emerald-600" strokeWidth={2} aria-hidden="true" />
                    {t("checkout.cashPart")}
                  </span>
                  <b className="text-lg tabular-nums text-ink">{money(cashPart)}</b>
                </div>
                {cardsTooMuch && <p className="text-[11px] font-semibold text-red-600">{t("checkout.cardsTooMuch", { due: money(due) })}</p>}
              </div>
            )}

            {split && cashPart === 0 ? null : isCard ? (
              <div className="flex flex-1 flex-col justify-center rounded-2xl border border-border/70 bg-surface-2/40 p-5">
                <div className={`mx-auto flex h-24 w-40 flex-col justify-between rounded-xl bg-gradient-to-br p-3 text-white shadow-xl ${METHOD_STYLE[method].gradient}`}>
                  <span className="h-5 w-7 rounded bg-amber-300/90" aria-hidden="true" />
                  <span className="text-right text-sm font-black tracking-widest">{t(`methods.${method}`).toUpperCase()}</span>
                </div>
                <p className="mt-5 text-center text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("checkout.chargeOnTerminal")}</p>
                <p className="mt-1 text-center text-3xl font-extrabold text-ink tabular-nums">
                  {money(due)} <span className="text-sm font-semibold text-ink-soft">{t("som")}</span>
                </p>
                <p className="mt-3 text-center text-xs text-ink-muted">{t("checkout.cardHint")}</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("received")}</p>
                    <p className="mt-1 text-3xl font-extrabold text-ink tabular-nums">{money(tendered)}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-2 text-right ${short ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                    <p className={`text-[11px] font-semibold ${short ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{short ? t("shortBy") : t("changeDue")}</p>
                    <p className={`text-xl font-extrabold tabular-nums ${short ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{money(Math.abs(change))}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setReceived("")} aria-pressed={received === ""} className="nz-liquid-chip rounded-xl px-3 py-2 text-xs font-bold">
                    {t("exact")}
                  </button>
                  {quick.map((v) => (
                    <button key={v} type="button" onClick={() => setReceived(String(v))} aria-pressed={received === String(v)} className="nz-liquid-chip rounded-xl px-3 py-2 text-xs font-bold tabular-nums">
                      {money(v)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "del"].map((k) => (
                    <button key={k} type="button" onClick={() => key(k)} className="flex h-12 items-center justify-center rounded-xl border border-border/70 bg-surface-2/50 text-lg font-bold text-ink transition-colors hover:border-primary hover:bg-primary-soft active:scale-95" aria-label={k === "del" ? t("checkout.backspace") : k}>
                      {k === "del" ? <Delete className="h-5 w-5" strokeWidth={2} /> : k}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 bg-surface-2/30 px-6 py-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-soft sm:flex-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={2} aria-hidden="true" />
            {needsReason ? t("checkout.reasonRequired") : t("checkout.secure")}
          </p>
          <button type="submit" disabled={blocked} className="nz-cta nz-shimmer-btn flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold disabled:pointer-events-none disabled:opacity-50">
            {busy && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />}
            {split ? t("checkout.confirmSplit", { amount: money(due) }) : isCard ? t("checkout.confirmCard", { amount: money(due), method: t(`methods.${method}`) }) : t("checkout.confirm", { amount: money(due) })}
            <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
