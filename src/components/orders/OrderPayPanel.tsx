"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, CircleX, CreditCard, Loader2, Lock, RefreshCw } from "lucide-react";
import type { OrderPaymentState, PaymentMethod, PaymentMethodKey } from "@/lib/payments-api";
import { methodName, withinLimits } from "@/components/checkout/PaymentMethodCard";

const POLL_MS = 2500;
const POLL_TRIES = 12;

/**
 * Order page: pay an unpaid order online (Payme / Click / Uzum / Uzcard / Humo), and -- when the customer
 * comes back from the provider (?payment=return) -- watch for the provider's confirmation for ~30 s,
 * then refresh the order. Renders nothing for paid orders or when no online method is switched on.
 */
export default function OrderPayPanel({ orderNumber, onPaid, onState }: { orderNumber: string; onPaid: () => void; onState?: (s: OrderPaymentState) => void }) {
  const t = useTranslations("checkout");
  const tp = useTranslations("checkout.pay.order");
  const tPay = useTranslations("checkout.pay");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const returning = searchParams.get("payment") === "return";
  const startFailed = searchParams.get("payment") === "failed";

  const [state, setState] = useState<OrderPaymentState | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [phase, setPhase] = useState<"idle" | "checking" | "paid" | "unconfirmed">(returning ? "checking" : "idle");
  const [choice, setChoice] = useState<PaymentMethodKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(startFailed ? tPay("startFailed") : null);
  const tries = useRef(0);

  const load = useCallback(() => fetchState(orderNumber), [orderNumber]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([load(), fetch("/api/payments/methods").then((r) => r.json()).catch(() => null)]).then(([s, m]) => {
      if (cancelled) return;
      if (s) {
        setState(s);
        onState?.(s);
      }
      if (m?.success) setMethods((m.data as PaymentMethod[]).filter((x) => x.online));
    });
    return () => {
      cancelled = true;
    };
  }, [load, onState]);

  // Back from the provider: the confirmation arrives server-to-server, usually within seconds.
  useEffect(() => {
    if (phase !== "checking") return;
    const id = setInterval(async () => {
      tries.current += 1;
      const s = await load();
      if (s) {
        setState(s);
        onState?.(s);
      }
      if (s?.paid) {
        clearInterval(id);
        setPhase("paid");
        onPaid();
      } else if (tries.current >= POLL_TRIES) {
        clearInterval(id);
        setPhase("unconfirmed");
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [phase, load, onPaid, onState]);

  const amount = state ? Number(state.amount) : null;
  const usable = methods.filter((m) => m.available && withinLimits(m, amount));
  const selected = choice && usable.some((m) => m.key === choice) ? choice : usable[0]?.key ?? null;

  async function pay() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderNumber)}/pay`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: selected, lang: locale }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (body?.success && body.data?.checkout_url) {
      window.location.assign(body.data.checkout_url);
      return;
    }
    setBusy(false);
    setError(tPay("startFailed"));
  }

  if (phase === "checking") {
    return (
      <section role="status" className="nz-liquid flex items-center gap-4 rounded-3xl p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <p className="font-bold text-ink">{tp("checking")}</p>
          <p className="text-sm text-ink-muted">{tp("checkingHint")}</p>
        </div>
      </section>
    );
  }

  if (phase === "paid") {
    return (
      <section role="status" className="nz-rise flex items-center gap-4 rounded-3xl border border-success/30 bg-success/10 p-5">
        <CircleCheck className="h-9 w-9 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
        <div>
          <p className="font-bold text-ink">{tp("paidTitle")}</p>
          <p className="text-sm text-ink-muted">{tp("paidBody")}</p>
        </div>
      </section>
    );
  }

  if (!state || state.paid || !state.can_pay_online || usable.length === 0) {
    return phase === "unconfirmed" ? (
      <Unconfirmed onRetry={() => { tries.current = 0; setPhase("checking"); }} title={tp("pendingTitle")} body={tp("pendingBody")} retry={tp("retry")} />
    ) : null;
  }

  const failed = state.latest && ["failed", "cancelled"].includes(state.latest.status);

  return (
    <section className="nz-liquid relative overflow-hidden rounded-3xl p-5" aria-labelledby="pay-online-title">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      {phase === "unconfirmed" && <Unconfirmed onRetry={() => { tries.current = 0; setPhase("checking"); }} title={tp("pendingTitle")} body={tp("pendingBody")} retry={tp("retry")} inline />}
      {failed && phase !== "unconfirmed" && (
        <p className="relative mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
          <CircleX className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {tp("failedTitle")}
        </p>
      )}
      <div className="relative flex items-start gap-3">
        <span className="nz-liquid-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <CreditCard className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div>
          <h2 id="pay-online-title" className="text-base font-extrabold tracking-tight text-ink">{tp("title")}</h2>
          <p className="text-sm text-ink-muted">{tp("subtitle")}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label={tp("choose")} className="relative mt-4 flex flex-wrap gap-2">
        {usable.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={selected === m.key}
            onClick={() => setChoice(m.key)}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-semibold transition-all ${selected === m.key ? "border-primary bg-primary-soft text-ink shadow-[0_0_0_3px_var(--nz-primary-soft)]" : "border-border bg-surface text-ink-muted hover:border-primary/40"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src={`/payments/${m.key}.svg`} alt="" className="h-6 w-9 rounded" />
            {methodName(m, t("cashOnDelivery"))}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="relative mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={pay} disabled={!selected || busy} className="nz-cta nz-shimmer-btn relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60 sm:w-auto">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" /> : <Lock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        {busy ? tPay("redirecting") : tp("pay", { amount: Math.round(amount ?? 0).toLocaleString("en-US").replace(/,/g, " ") })}
      </button>
    </section>
  );
}

async function fetchState(orderNumber: string): Promise<OrderPaymentState | null> {
  const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderNumber)}`, { cache: "no-store" }).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  return body?.success ? (body.data as OrderPaymentState) : null;
}

function Unconfirmed({ onRetry, title, body, retry, inline = false }: { onRetry: () => void; title: string; body: string; retry: string; inline?: boolean }) {
  return (
    <div role="status" className={`${inline ? "relative mb-4" : ""} flex flex-wrap items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4`}>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{body}</p>
      </div>
      <button type="button" onClick={onRetry} className="nz-liquid-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold">
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        {retry}
      </button>
    </div>
  );
}
