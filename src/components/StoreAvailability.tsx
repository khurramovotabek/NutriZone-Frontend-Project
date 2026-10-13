import Link from "next/link";
import { ChevronRight, MapPin, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StoreAvailability as StoreAvailabilityRow } from "@/lib/api";

/**
 * "Where can I buy it today?" -- the real stores (branches) that carry the
 * selected variant, each with its own unit count, stores with stock first.
 * Driven entirely by the variant's `store_availability` from the backend
 * (warehouse id = Store id); renders nothing when the backend didn't send
 * the field at all, and an honest "not in any store" line when it's empty.
 */
export default function StoreAvailability({ stores }: { stores: StoreAvailabilityRow[] | undefined }) {
  const t = useTranslations("product");
  if (!stores) return null;

  const inStockCount = stores.filter((s) => s.available_quantity > 0).length;

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

      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{t("storeAvailabilityNone")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {stores.map((store) => {
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
                        <span className="truncate">{[location, store.address].filter(Boolean).join(" · ")}</span>
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
