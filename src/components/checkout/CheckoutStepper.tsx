"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export type CheckoutStep = "delivery" | "payment" | "review";
const STEPS: CheckoutStep[] = ["delivery", "payment", "review"];

/** 3-step checkout stepper (Delivery & Customer Info -> Payment -> Review & Confirmation), replacing the old 2-step "delivery/done" version. */
export default function CheckoutStepper({ current }: { current: CheckoutStep }) {
  const t = useTranslations("checkout.steps");
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className="mb-8 flex items-center" aria-label={t("label")}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "nz-cta" : isCurrent ? "border-2 border-primary text-primary" : "border border-border text-ink-soft"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${isCurrent || done ? "text-ink" : "text-ink-soft"}`}>{t(step)}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-3 h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
