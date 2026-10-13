"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, LoaderCircle, LocateFixed, MapPin, Store as StoreIcon, Truck } from "lucide-react";
import MapLinks from "@/components/MapLinks";

export interface PickupOption {
  id: string;
  name: string;
  slug: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  has_all: boolean;
  missing_units: number;
  distance_km: number | null;
  is_open_now: boolean;
  today: string;
}

/**
 * Checkout step 1: delivered to an address, or picked up at a branch. For pickup the branches come from
 * /api/stores/pickup-options for exactly this cart: those with every item free first, then the nearest (to the
 * chosen address, or to the customer when they tap "nearest to me"). A branch missing items can't be picked.
 */
export default function FulfilmentPicker({
  method, onMethod, items, near, selectedId, onSelect,
}: {
  method: "delivery" | "pickup";
  onMethod: (m: "delivery" | "pickup") => void;
  items: { variantId: string; quantity: number }[];
  near: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (store: PickupOption | null) => void;
}) {
  const t = useTranslations("checkout.fulfilment");
  const [options, setOptions] = useState<PickupOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const point = me ?? near;
  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(",");

  useEffect(() => {
    if (method !== "pickup" || !itemsKey) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stores/pickup-options?items=${itemsKey}${point ? `&lat=${point.lat}&lng=${point.lng}` : ""}`);
        const body = await res.json();
        if (!cancelled) setOptions(body?.success ? body.data : []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [method, itemsKey, point]);

  // keep the selection only while that branch can still take the whole cart
  useEffect(() => {
    if (!options || !selectedId) return;
    const still = options.find((o) => o.id === selectedId && o.has_all);
    if (!still) onSelect(null);
  }, [options, selectedId, onSelect]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const tab = "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors";
  return (
    <div className="space-y-4">
      <div className="nz-glass flex gap-1 rounded-2xl p-1" role="radiogroup" aria-label={t("label")}>
        <button type="button" role="radio" aria-checked={method === "delivery"} onClick={() => onMethod("delivery")} className={`${tab} ${method === "delivery" ? "nz-cta text-white" : "text-ink-muted hover:text-ink"}`}>
          <Truck className="h-4 w-4" aria-hidden="true" /> {t("delivery")}
        </button>
        <button type="button" role="radio" aria-checked={method === "pickup"} onClick={() => onMethod("pickup")} className={`${tab} ${method === "pickup" ? "nz-cta text-white" : "text-ink-muted hover:text-ink"}`}>
          <StoreIcon className="h-4 w-4" aria-hidden="true" /> {t("pickup")}
        </button>
      </div>

      {method === "pickup" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-soft">{t("pickupHint")}</p>
            <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60">
              {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />}
              {t("nearestToMe")}
            </button>
          </div>
          {loading && !options ? (
            <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-hidden="true" />
          ) : options && options.length === 0 ? (
            <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-ink">{t("noStores")}</p>
          ) : (
            <ul className="space-y-2" role="radiogroup" aria-label={t("chooseStore")}>
              {(options ?? []).map((o) => {
                const selected = o.id === selectedId;
                return (
                  <li key={o.id}>
                    <div role="radio" aria-checked={selected} aria-disabled={!o.has_all} tabIndex={o.has_all ? 0 : -1}
                      onClick={() => o.has_all && onSelect(o)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && o.has_all) { e.preventDefault(); onSelect(o); } }}
                      className={`rounded-2xl border p-3 transition-colors ${!o.has_all ? "cursor-not-allowed border-border opacity-60" : selected ? "cursor-pointer border-primary bg-primary-soft/40" : "cursor-pointer border-border hover:border-primary/50"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border"}`}>
                          {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{o.name}</span>
                            {o.distance_km != null && <span className="text-xs text-ink-soft">{t("km", { km: o.distance_km })}</span>}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${o.has_all ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/12 text-rose-600 dark:text-rose-400"}`}>
                              {o.has_all ? t("allInStock") : t("missing", { count: o.missing_units })}
                            </span>
                          </div>
                          {o.address && <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted"><MapPin className="h-3 w-3" aria-hidden="true" />{o.address}</p>}
                          <p className={`mt-0.5 flex items-center gap-1 text-xs ${o.is_open_now ? "text-emerald-600 dark:text-emerald-400" : "text-ink-soft"}`}>
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {o.is_open_now ? t("openNow") : t("closedNow")}{o.today ? ` · ${o.today}` : ""}
                          </p>
                        </div>
                      </div>
                      {selected && o.latitude != null && o.longitude != null && (
                        <div className="mt-2 pl-8" onClick={(e) => e.stopPropagation()}>
                          <MapLinks latitude={o.latitude} longitude={o.longitude} label={o.name} compact />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
