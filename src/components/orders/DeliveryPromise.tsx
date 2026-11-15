"use client";

import { useEffect, useState } from "react";
import { CalendarClock, MessageCircle, PackageCheck, PackageOpen, Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { loadDeliveryOptions, type DeliveryOptions } from "@/components/checkout/DeliveryRatesNote";

type Zone = "tashkent" | "regions" | null | undefined;

/** The dashboard's delivery promise per zone ("1 ish kuni ichida" / "2 ish kuni ichida"), localized by the API. */
export function useDeliveryEtas(): { tashkent: string; regions: string } | null {
  const [options, setOptions] = useState<DeliveryOptions | null>(null);
  useEffect(() => {
    let alive = true;
    void loadDeliveryOptions().then((o) => {
      if (alive) setOptions(o);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!options) return null;
  return { tashkent: options.zones.tashkent.eta, regions: options.zones.regions.eta };
}

/**
 * Shown right after checkout: three plain steps (received → packed → delivered/picked up) and, for delivery
 * orders, the delivery times of both zones with the customer's own zone highlighted.
 */
export default function DeliveryPromise({ zone, pickup }: { zone: Zone; pickup: boolean }) {
  const t = useTranslations("orders.detail.next");
  const etas = useDeliveryEtas();
  const steps = [
    { icon: PackageCheck, title: t("step1Title"), text: t("step1Text") },
    { icon: PackageOpen, title: t("step2Title"), text: t("step2Text") },
    pickup
      ? { icon: Store, title: t("step3PickupTitle"), text: t("step3PickupText") }
      : { icon: Truck, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="relative mt-5 rounded-2xl bg-white/95 p-4 text-left text-ink shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)] sm:p-5 dark:bg-surface/95">
      <p className="text-sm font-bold text-ink">{t("title")}</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 sm:flex-col sm:gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--nz-success)_14%,transparent)] text-[var(--nz-success)]">
              <s.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                <span className="mr-1 text-ink-soft tabular-nums">{i + 1}.</span>
                {s.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      {!pickup && etas && (etas.tashkent || etas.regions) && (
        <div className="mt-4 border-t border-border/70 pt-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <CalendarClock className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
            {t("etaTitle")}
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {(["tashkent", "regions"] as const).map((z) =>
              etas[z] ? (
                <div
                  key={z}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${zone === z ? "border-primary/50 bg-primary/8 ring-1 ring-primary/25" : "border-border/70 bg-surface-2/50"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{t(z)}</span>
                    {zone === z && <span className="block text-[11px] font-medium text-primary">{t("yourZone")}</span>}
                  </span>
                  <span className="shrink-0 text-right text-sm font-bold text-ink">{etas[z]}</span>
                </div>
              ) : null,
            )}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{t("workingDaysNote")}</p>
        </div>
      )}

      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.9} aria-hidden="true" />
        {t("help")}
      </p>
    </div>
  );
}
