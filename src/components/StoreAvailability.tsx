"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LoaderCircle, LocateFixed, MapPin, Navigation, PackageCheck, Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StoreAvailability as StoreAvailabilityRow } from "@/lib/api";
import { approxPosition } from "@/lib/current-position";
import { distanceMeters, formatDistance } from "@/lib/geo-distance";
import { yandexRouteUrl } from "@/lib/maps";

/**
 * "Where can I buy it today?" -- the real stores (branches) that carry the selected variant, as one collapsible
 * liquid-glass panel. Closed, it answers the first question at a glance: the total units on branch shelves and in
 * how many stores (plus a per-store stock bar); opened, it lists every branch with its own count, stocked branches
 * first. Driven entirely by the variant's `store_availability` (warehouse id = Store id); renders nothing when the
 * backend didn't send the field, and an honest "not in any store" line when it's empty.
 * "How far is it?" asks for the customer's location once: every branch then shows its distance, stocked branches
 * are ordered nearest first and the nearest one gets a route button.
 */
export default function StoreAvailability({ stores, onlineInStock = false }: { stores: StoreAvailabilityRow[] | undefined; /** the variant still ships from the central warehouse */ onlineInStock?: boolean }) {
  const t = useTranslations("product");
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const rows = useMemo(() => {
    const list = (stores ?? []).map((s) => ({
      ...s,
      meters: me && s.latitude != null && s.longitude != null ? distanceMeters(me, { lat: s.latitude, lng: s.longitude }) : null,
    }));
    // stocked branches first (most units first), then -- once located -- nearest first
    list.sort((a, b) =>
      Number(a.available_quantity <= 0) - Number(b.available_quantity <= 0)
      || (me ? (a.meters ?? 1e12) - (b.meters ?? 1e12) : b.available_quantity - a.available_quantity),
    );
    return list;
  }, [stores, me]);

  if (!stores) return null;

  const stocked = stores.filter((s) => s.available_quantity > 0);
  const total = stocked.reduce((sum, s) => sum + s.available_quantity, 0);
  const hasCoords = stores.some((s) => s.latitude != null && s.longitude != null);
  const nearest = me ? rows.find((r) => r.available_quantity > 0 && r.meters != null) : undefined;
  const maxUnits = Math.max(1, ...stocked.map((s) => s.available_quantity));

  async function locate() {
    setLocating(true);
    setGeoError(false);
    const pos = await approxPosition();
    setLocating(false);
    if ("lat" in pos) setMe(pos);
    else setGeoError(true);
  }

  const summary = total > 0
    ? t("storeSummary", { total, stores: stocked.length })
    : t(onlineInStock ? "storeAvailabilityOnlineOnly" : "storeAvailabilityNone");

  return (
    <section className="nz-liquid mt-4 overflow-hidden rounded-2xl" aria-labelledby={`${panelId}-title`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${panelId}-panel`}
        className="group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-primary/[0.04] sm:p-5"
      >
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${total > 0 ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-soft"}`}>
          <Store className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
              <span className="absolute h-full w-full animate-ping rounded-full bg-success/50" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span id={`${panelId}-title`} className="block text-[15px] font-semibold text-ink">{t("storeAvailabilityTitle")}</span>
          <span className={`mt-0.5 block text-xs leading-snug sm:text-[13px] ${total > 0 ? "text-ink-muted" : "text-ink-soft"}`}>{summary}</span>
        </span>
        {total > 0 && (
          <span className="hidden shrink-0 flex-col items-end leading-none sm:flex">
            <span className="text-xl font-bold tabular-nums tracking-tight text-ink">{total.toLocaleString("ru-RU").replace(/\s/g, " ")}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{t("storeTotalLabel")}</span>
          </span>
        )}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2/80 text-ink-muted transition-colors group-hover:bg-primary-soft group-hover:text-primary">
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </button>

      {/* closed: a slim per-store stock bar so the spread across branches reads without opening */}
      {!open && stocked.length > 1 && (
        <div className="flex gap-1 px-4 pb-4 sm:px-5" aria-hidden="true">
          {rows.filter((r) => r.available_quantity > 0).slice(0, 8).map((s) => (
            <span key={s.store_id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${Math.max(12, (s.available_quantity / maxUnits) * 100)}%` }} />
            </span>
          ))}
        </div>
      )}

      <div id={`${panelId}-panel`} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="border-t border-border/70 px-4 pb-4 pt-3 sm:px-5">
            {stores.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <PackageCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t("storeAvailabilityCount", { count: stocked.length })}
                </span>
                {onlineInStock && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    <Truck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    {t("storeOnlineToo")}
                  </span>
                )}
                {hasCoords && stocked.length > 0 && !me && (
                  <button type="button" onClick={locate} disabled={locating}
                    className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60">
                    {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />}
                    {t("storeHowFar")}
                  </button>
                )}
              </div>
            )}
            {geoError && <p className="mb-2 text-xs text-ink-soft">{t("storeHowFarError")}</p>}
            {nearest && nearest.meters != null && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-primary-soft p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{t("storeNearest")} · <span className="whitespace-nowrap normal-case">{formatDistance(nearest.meters)}</span></p>
                  <p className="truncate text-sm font-semibold text-ink">{nearest.name}</p>
                </div>
                <a href={yandexRouteUrl(nearest.latitude!, nearest.longitude!)} target="_blank" rel="noopener noreferrer"
                  className="nz-cta inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  {t("storeRoute")}
                </a>
              </div>
            )}

            {stores.length === 0 ? (
              // Sold online from the central warehouse but not on any branch shelf: say it ships, not just "nowhere".
              <p className="py-1 text-sm text-ink-soft">{t(onlineInStock ? "storeAvailabilityOnlineOnly" : "storeAvailabilityNone")}</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {rows.map((store) => {
                  const available = store.available_quantity > 0;
                  const location = [store.district, store.city].filter(Boolean).join(", ");
                  const low = available && store.available_quantity <= 10;
                  return (
                    <li key={store.store_id}>
                      <Link
                        href={`/store/${store.slug}`}
                        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2/70"
                        aria-label={`${store.name} -- ${t("viewStore")}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${available ? (low ? "bg-amber-500" : "bg-success") : "bg-red-500/70"}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-semibold ${available ? "text-ink" : "text-ink-muted"} group-hover:text-primary`}>{store.name}</span>
                          {(location || store.address || store.meters != null) && (
                            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-soft">
                              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                              <span className="truncate">{[store.meters != null ? formatDistance(store.meters) : "", location, store.address].filter(Boolean).join(" · ")}</span>
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
                            available ? (low ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-success/10 text-success") : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {available ? t("storeUnits", { count: store.available_quantity }) : t("outOfStock")}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
