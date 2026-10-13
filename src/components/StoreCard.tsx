import Link from "next/link";
import { Clock, MapPin, Navigation, Package, Phone, Star, Store as StoreIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { StoreListItem } from "@/lib/store-api";
import MediaImage from "@/components/MediaImage";
import { yandexRouteUrl } from "@/lib/maps";

/** < 1km in meters, otherwise km with one decimal -- the same convention as every other distance label in the app. */
function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * One branch in the /stores directory: the cover in the store's own brand colour, the logo overlapping it, live
 * open/closed state, today's hours, rating, stock and quick actions (call / directions). The whole card is a link;
 * the action buttons sit above the card's link layer so they stay independently clickable.
 */
export default async function StoreCard({ store }: { store: StoreListItem }) {
  const t = await getTranslations("stores");
  const accent = store.color || "#10b981";
  const today = store.today_hours;
  const mapUrl = store.latitude != null && store.longitude != null ? yandexRouteUrl(store.latitude, store.longitude) : null;
  const place = [store.city, store.district].filter(Boolean).join(", ");

  const status =
    store.status === "temporarily_closed"
      ? { label: t("temporarilyClosed"), cls: "bg-amber-500/90 text-white" }
      : store.status === "coming_soon"
        ? { label: t("comingSoon"), cls: "bg-blue-500/90 text-white" }
        : store.is_open_now
          ? { label: t("open"), cls: "bg-emerald-500/90 text-white" }
          : { label: t("closed"), cls: "bg-black/55 text-white/90" };

  return (
    <article
      className="nz-glass-interactive group relative flex flex-col overflow-hidden rounded-3xl"
      style={{ ["--c" as string]: accent }}
    >
      <Link href={`/store/${store.slug}`} className="absolute inset-0 z-[1] rounded-3xl" aria-label={store.name} />

      <div className="relative h-36 w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 45%, #0b1220))` }}>
        {store.cover_image_url && (
          <MediaImage src={store.cover_image_url} alt="" fit="cover" loading="lazy" fallbackIcon={null} className="transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm ${status.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${store.is_open_now && store.status === "active" ? "animate-pulse bg-white" : "bg-white/70"}`} aria-hidden="true" />
          {status.label}
        </span>
        {store.distance_meters !== null && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <MapPin className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            {formatDistance(store.distance_meters)}
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col px-4 pb-4">
        <div
          className="relative -mt-8 mb-2 h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-lg ring-4"
          style={{ ["--tw-ring-color" as string]: `color-mix(in srgb, ${accent} 70%, transparent)` }}
        >
          <MediaImage src={store.logo_url} alt="" fit="contain" padding="p-1.5" fallbackIcon={<StoreIcon className="h-7 w-7" style={{ color: accent }} strokeWidth={1.5} aria-hidden="true" />} />
        </div>

        <h2 className="text-lg font-bold leading-tight text-ink transition-colors group-hover:text-[var(--c)]">{store.name}</h2>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {store.rating_count > 0 && store.rating_average !== null ? (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
              <span className="font-semibold text-ink">{store.rating_average.toFixed(1)}</span>
              <span className="text-ink-soft">({store.rating_count})</span>
            </span>
          ) : (
            <span className="text-xs text-ink-soft">{t("noRating")}</span>
          )}
          {store.product_count != null && store.product_count > 0 && (
            <span className="flex items-center gap-1 text-ink-muted">
              <Package className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {t("productsCount", { count: store.product_count })}
            </span>
          )}
        </div>

        {(store.address || place) && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="line-clamp-2">{[place, store.address].filter(Boolean).join(" · ")}</span>
          </p>
        )}

        {today && store.status === "active" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-ink-soft">{t("todayLabel")}:</span>
            {today.closed ? (
              <span className="font-medium text-ink-muted">{t("closedAllDay")}</span>
            ) : (
              <span className="font-semibold tabular-nums text-ink">
                {today.open}–{today.close}
              </span>
            )}
            {today.special && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{today.note || t("specialToday")}</span>}
          </p>
        )}

        <div className="relative z-[2] mt-4 flex items-center gap-2 pt-1">
          <Link
            href={`/store/${store.slug}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, #000))` }}
          >
            <StoreIcon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            {t("viewStore")}
          </Link>
          {store.phone && (
            <a href={`tel:${store.phone}`} aria-label={t("call")} title={t("call")} className="nz-glass flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:text-primary">
              <Phone className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            </a>
          )}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={t("getDirections")} title={t("getDirections")} className="nz-glass flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:text-primary">
              <Navigation className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
