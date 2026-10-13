"use client";

import { Check, Clock, FlaskConical, Lock, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaymentMethod, PaymentMethodKey } from "@/lib/payments-api";
import { Card } from "@/components/ui";

/** Cash on delivery: always offered when the payments service can't be reached. */
export const CASH_FALLBACK: PaymentMethod = { key: "cash", name: "", color: "#16a34a", online: false, available: true, status: "active", test_mode: false, min_amount: null, max_amount: null, via: null };

const NAMES: Record<PaymentMethodKey, string> = { cash: "", payme: "Payme", click: "Click", uzum: "Uzum Bank", uzcard: "Uzcard", humo: "Humo" };

export function methodName(m: Pick<PaymentMethod, "key" | "name">, cashLabel: string) {
  return m.key === "cash" ? cashLabel : NAMES[m.key] || m.name;
}

export function withinLimits(m: PaymentMethod, amount: number | null): boolean {
  if (amount === null || !m.online) return true;
  if (m.min_amount && amount < Number(m.min_amount)) return false;
  return !(m.max_amount && amount > Number(m.max_amount));
}

/**
 * Checkout payment methods from the Dashboard (Payme / Click / Uzum / Uzcard / Humo / cash). A method
 * that isn't switched on and configured shows "coming soon" and can't be picked; one outside its amount
 * limits says so. Online methods hand the customer to the provider's secure page after the order is placed.
 */
export default function PaymentMethodCard({ methods, value, onChange, amount, pickup = false }: { methods: PaymentMethod[]; value: PaymentMethodKey; onChange: (key: PaymentMethodKey) => void; amount: number | null; pickup?: boolean }) {
  const t = useTranslations("checkout");
  const tp = useTranslations("checkout.pay");
  const list = methods.length ? methods : [CASH_FALLBACK];
  const selected = list.find((m) => m.key === value);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-ink-muted">{tp("title")}</h2>
      <div role="radiogroup" aria-label={tp("title")} className="grid gap-2.5 sm:grid-cols-2">
        {list.map((m) => {
          const usable = m.available && withinLimits(m, amount);
          const on = usable && m.key === value;
          const name = methodName(m, pickup ? t("cashAtStore") : t("cashOnDelivery"));
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!usable}
              disabled={!usable}
              onClick={() => usable && onChange(m.key)}
              className={`group relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                on ? "border-primary bg-primary-soft shadow-[0_0_0_3px_var(--nz-primary-soft)]" : usable ? "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" : "cursor-not-allowed border-dashed border-border bg-surface-2/40"
              }`}
              style={{ "--pm": m.color } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src={`/payments/${m.key}.svg`} alt="" className={`h-9 w-[54px] shrink-0 rounded-lg shadow-sm ${usable ? "" : "opacity-50 grayscale"}`} />
              <span className="min-w-0 flex-1">
                <span className={`flex items-center gap-1.5 text-sm font-bold ${usable ? "text-ink" : "text-ink-soft"}`}>
                  {name}
                  {m.test_mode && usable && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      <FlaskConical className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                      {tp("test")}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                  {!m.available ? tp(`desc.${m.key}`) : !usable ? tp("outOfLimit") : m.via ? tp("via", { name: NAMES[m.via] }) : tp(`desc.${m.key}`)}
                </span>
              </span>
              {on ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : !m.available ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  {tp("comingSoon")}
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border transition-colors group-hover:border-primary/50" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2/50 px-3 py-2.5 text-xs text-ink-muted">
          {selected.online ? <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.25} aria-hidden="true" /> : <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.25} aria-hidden="true" />}
          {selected.online ? tp("secure", { name: selected.via ? NAMES[selected.via] : methodName(selected, "") }) : tp("secureCash")}
        </p>
      )}
    </Card>
  );
}
