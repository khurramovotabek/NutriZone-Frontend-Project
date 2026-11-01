"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, LoaderCircle, LocateFixed, MapPin, Navigation, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StoreAvailability as StoreAvailabilityRow } from "@/lib/api";
import { approxPosition } from "@/lib/current-position";
import { distanceMeters, formatDistance } from "@/lib/geo-distance";
import { yandexRouteUrl } from "@/lib/maps";

/**
 * "Where can I buy it today?" -- the real stores (branches) that carry the
 * selected variant, each with its own unit count, stores with stock first.
 * Driven entirely by the variant's `store_availability` from the backend
 * (warehouse id = Store id); renders nothing when the backend didn't send
 * the field at all, and an honest "not in any store" line when it's empty.
 * "How far is it?" asks for the customer's location once: every branch then shows its distance, stocked branches
 * are ordered nearest first and the nearest one gets a route button.
 */
export default function StoreAvailability({ stores }: { stores: StoreAvailabilityRow[] | undefined }) {
  const t = useTranslations("product");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const rows = useMemo(() => {
    const list = (stores ?? []).map((s) => ({
      ...s,
      meters: me && s.latitude != null && s.longitude != null ? distanceMeters(me, { lat: s.latitude, lng: s.longitude }) : null,
    }));
    if (me) list.sort((a, b) => Number(a.available_quantity <= 0) - Number(b.available_quantity <= 0) || (a.meters ?? 1e12) - (b.meters ?? 1e12));
    return list;
  }, [stores, me]);

  if (!stores) return null;

  const inStockCount = stores.filter((s) => s.available_quantity > 0).length;
  const hasCoords = stores.some((s) => s.latitude != null && s.longitude != null);
  const nearest = me ? rows.find((r) => r.available_quantity > 0 && r.meters != null) : undefined;

  async function locate() {
    setLocating(true);
    setGeoError(false);
    const pos = await approxPosition();
    setLocating(false);
    if ("lat" in pos) setMe(pos);
    else setGeoError(true);
  }

  return (
    <section className="nz-glass mt-5 rounded-2xl p-5" aria-labelledby="store-availability-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="store-availability-title" className="flex items-center gap-2 text-base font-semibold text-ink">
          <Store className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} aria-hidden="true" />
          {t("storeAvailabilityTitle")}
        </h2>
        {inStockCount > 0 && (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{t("storeAvailabilityCount", { count: inStockCount })}</span>
        )}
      </div>

      {hasCoords && inStockCount > 0 && !me && (
        <button type="button" onClick={locate} disabled={locating}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60">
          {locating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
          {t("storeHowFar")}
        </button>
      )}
      {geoError && <p className="mt-2 text-xs text-ink-soft">{t("storeHowFarError")}</p>}
      {nearest && nearest.meters != null && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary-soft p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{t("storeNearest")} · <span className="whitespace-nowrap normal-case">{formatDistance(nearest.meters)}</span></p>
            <p className="truncate text-sm font-semibold text-ink">{nearest.name}</p>
          </div>
          <a href={yandexRouteUrl(nearest.latitude!, nearest.longitude!)} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white">
            <Navigation className="h-4 w-4" aria-hidden="true" />
            {t("storeRoute")}
          </a>
        </div>
      )}

      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{t("storeAvailabilityNone")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((store) => {
            const available = store.available_quantity > 0;
            const location = [store.district, store.city].filter(Boolean).join(", ");
            return (
              <li key={store.store_id}>
                <Link
                  href={`/store/${store.slug}`}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface-2"
                  aria-label={`${store.name} -- ${t("viewStore")}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${available ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-soft"}`}>
                    <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${available ? "text-ink" : "text-ink-muted"} group-hover:text-primary`}>{store.name}</span>
                    {(location || store.address) && (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-soft">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="truncate">{[store.meters != null ? formatDistance(store.meters) : "", location, store.address].filter(Boolean).join(" · ")}</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      available ? (store.available_quantity <= 10 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-success/10 text-success") : "bg-red-500/10 text-red-600 dark:text-red-400"
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
    </section>
  );
}
