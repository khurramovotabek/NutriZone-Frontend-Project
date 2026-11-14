"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export type CheckoutStep = "delivery" | "review";
const STEPS: { key: CheckoutStep; label: "delivery" | "payReview" }[] = [
  { key: "delivery", label: "delivery" },
  { key: "review", label: "payReview" },
];

/**
 * 2-step checkout: Delivery & recipient -> Payment & confirmation (payment used to be its own step; on a phone that
 * was one more full page and tap for a choice that is usually "cash"). Labels stay visible on phones too.
 */
export default function CheckoutStepper({ current }: { current: CheckoutStep }) {
  const t = useTranslations("checkout.steps");
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="mb-5 flex items-center sm:mb-8" aria-label={t("label")}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.key} className={`flex min-w-0 items-center ${isCurrent ? "flex-1" : "shrink-0"}`} aria-current={isCurrent ? "step" : undefined}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done || isCurrent ? "nz-cta" : "border border-border text-ink-soft"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : i + 1}
              </span>
              {/* phones: only the current step is named (the others are numbers), so the bar never runs off-screen */}
              <span className={`truncate text-[13px] font-semibold sm:inline sm:text-sm ${isCurrent ? "text-ink" : "hidden text-ink-soft"}`}>{t(step.label)}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full bg-primary transition-all duration-500 ${done ? "w-full" : "w-1/2"}`} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
