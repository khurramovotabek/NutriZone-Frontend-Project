"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ORDER_STEPS } from "./order-status";

/**
 * Delivery stepper: placed → confirmed → preparing → on the way → delivered.
 * `showLabels` prints every step name under its dot (needs ~480px); without
 * it only numbers/checks show, with names kept for screen readers and tooltips.
 */
export default function OrderProgress({ current, showLabels = false, className = "", pickup = false }: { current: number; showLabels?: boolean; className?: string; pickup?: boolean }) {
  const t = useTranslations("account.dashboardPage");

  return (
    <ol className={`relative flex items-start justify-between ${showLabels ? "pb-7" : ""} ${className}`}>
      <span aria-hidden="true" className="absolute left-3 right-3 top-3 h-0.5 rounded-full bg-surface-3" />
      <span
        aria-hidden="true"
        className="nz-journey-fill absolute left-3 top-3 h-0.5 rounded-full bg-gradient-to-r from-primary to-success"
        style={{ width: `calc((100% - 1.5rem) * ${current / (ORDER_STEPS.length - 1)})` }}
      />
      {ORDER_STEPS.map((step, i) => {
        const done = i < current || (i === current && i === ORDER_STEPS.length - 1);
        const active = i === current && !done;
        return (
          <li
            key={step}
            title={t(pickup && (step === "shipped" || step === "delivered") ? (step === "shipped" ? "steps.readyForPickup" : "steps.pickedUp") : `steps.${step}`)}
            className="relative flex h-6 w-6 shrink-0 justify-center"
            aria-current={i === current ? "step" : undefined}
          >
            <span
              className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                done ? "border-success bg-success text-white" : active ? "border-primary bg-surface text-primary" : "border-border bg-surface text-ink-soft"
              }`}
            >
              {active && <span aria-hidden="true" className="nz-journey-pulse absolute inset-0 rounded-full border-2 border-primary" />}
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            {showLabels ? (
              <span
                className={`absolute top-8 whitespace-nowrap text-xs font-medium ${i === current ? "text-ink" : "text-ink-soft"} ${
                  i === 0 ? "left-0" : i === ORDER_STEPS.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"
                }`}
              >
                {t(pickup && (step === "shipped" || step === "delivered") ? (step === "shipped" ? "steps.readyForPickup" : "steps.pickedUp") : `steps.${step}`)}
              </span>
            ) : (
              <span className="sr-only">{t(pickup && (step === "shipped" || step === "delivered") ? (step === "shipped" ? "steps.readyForPickup" : "steps.pickedUp") : `steps.${step}`)}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
