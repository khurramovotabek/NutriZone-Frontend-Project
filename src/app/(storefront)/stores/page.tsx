import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { DoorOpen, LayoutGrid, Map as MapIcon, MapPinned, Store as StoreIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getStores } from "@/lib/store-api";
import NearMeFilter from "@/components/NearMeFilter";
import StoreCard from "@/components/StoreCard";
import StoresMap from "@/components/StoresMapLazy";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import StoreJsonLd from "@/components/StoreJsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const [t, { name }] = await Promise.all([getTranslations("seo"), getBrand()]);
  return pageMetadata({ path: "/stores", title: t("storesTitle"), description: t("storesDescription", { brand: name }) });
}

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; district?: string; open_now?: string; lat?: string; lng?: string; page?: string; view?: string }>;
}) {
  const t = await getTranslations("stores");
  const tNav = await getTranslations("navigation");
  const params = await searchParams;
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;
  const page = Number(params.page ?? "1") || 1;
  const mapView = params.view === "map";

  const { results: stores, count, next: hasNext, previous: hasPrevious, cities: allCities, open_now_count: openNowCount } = await getStores({
    city: params.city,
    district: params.district,
    openNow: params.open_now === "true",
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    page,
  });

  // Real, honest limitation: `GET /stores` has no facets endpoint of
  // its own (unlike products' `meta.facets`), so these city/district
  // chips can only ever reflect whichever stores landed on THIS page
  // -- a store whose city only appears on page 2 won't get a chip
  // while viewing page 1. Not fabricated, just incomplete once a
  // future catalog outgrows one page; acceptable today since /stores
  // (page_size 20) holds every real store in one page.
  // city chips come from the API's facet over every public store (falls back to this page's cities)
  const cities = allCities && allCities.length ? allCities : Array.from(new Set(stores.map((s) => s.city).filter(Boolean)));
  const districts = Array.from(new Set(stores.map((s) => s.district).filter(Boolean)));

  // Preserves every active filter (city/district/open_now/lat/lng) --
  // previously this dropped lat/lng whenever a city/district chip was
  // clicked, silently cancelling an active "Near Me" search. Changing
  // any real filter resets back to page 1; explicit pagination links
  // pass `page` themselves via `overrides`.
  const buildFilterUrl = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { city: params.city, district: params.district, open_now: params.open_now, lat: params.lat, lng: params.lng, view: params.view, page: undefined as string | undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return `/stores${query ? `?${query}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <StoreJsonLd stores={stores} locale={(await getLocale()) as Locale} brandName={(await getBrand()).name} />
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex items-center gap-1.5 text-xs text-ink-muted">
        <Link href="/" className="transition-colors hover:text-primary">
          {tNav("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-ink">
          {t("title")}
        </span>
      </nav>

      <header className="nz-glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("heroEyebrow")}</p>
        <h1 className="relative mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t("title")}</h1>
        <p className="relative mt-2 max-w-2xl text-ink-muted">{t("subtitle")}</p>
        <dl className="relative mt-6 grid max-w-xl grid-cols-3 gap-3">
          {[
            { icon: StoreIcon, value: count, label: t("statStores"), tone: "text-emerald-500 bg-emerald-500/12" },
            { icon: DoorOpen, value: openNowCount ?? stores.filter((s) => s.is_open_now).length, label: t("statOpen"), tone: "text-sky-500 bg-sky-500/12" },
            { icon: MapPinned, value: cities.length, label: t("statCities"), tone: "text-violet-500 bg-violet-500/12" },
          ].map(({ icon: Icon, value, label, tone }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-surface/40 p-3 backdrop-blur-sm">
              <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
              <dt className="sr-only">{label}</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">{value}</dd>
              <dd className="text-xs text-ink-soft">{label}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Filters + list/map switch */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="nz-glass order-last ml-auto flex gap-1 rounded-2xl p-1">
          <Link href={buildFilterUrl({ view: undefined })} aria-current={!mapView ? "page" : undefined} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${!mapView ? "bg-primary text-white" : "text-ink-muted hover:text-ink"}`}>
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("viewList")}
          </Link>
          <Link href={buildFilterUrl({ view: "map" })} aria-current={mapView ? "page" : undefined} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${mapView ? "bg-primary text-white" : "text-ink-muted hover:text-ink"}`}>
            <MapIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("viewMap")}
          </Link>
        </div>
        <Suspense fallback={null}>
          <NearMeFilter />
        </Suspense>

        <Link
          href={buildFilterUrl({ open_now: params.open_now === "true" ? undefined : "true" })}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            params.open_now === "true" ? "border-primary/25 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40"
          }`}
        >
          {t("openNow")}
        </Link>

        {cities.map((city) => (
          <Link
            key={city}
            href={buildFilterUrl({ city: params.city === city ? undefined : city })}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors ${
              params.city === city ? "border-primary/25 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40"
            }`}
          >
            {city}
          </Link>
        ))}

        {districts.map((district) => (
          <Link
            key={district}
            href={buildFilterUrl({ district: params.district === district ? undefined : district })}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors ${
              params.district === district ? "border-primary/25 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40"
            }`}
          >
            {district}
          </Link>
        ))}

        {(params.city || params.district || params.open_now || params.lat) && (
          <Link href="/stores" className="text-sm text-ink-muted underline hover:text-primary">
            {t("clearFilters")}
          </Link>
        )}
      </div>

      {/* Grid */}
      {stores.length === 0 ? (
        <div className="mt-16 text-center text-ink-muted">
          <p className="text-lg font-medium">{t("noStoresFound")}</p>
          <p className="mt-1 text-sm">{t("tryDifferentFilters")}</p>
        </div>
      ) : (
        <>
        {mapView && (
          <div className="mt-8">
            <StoresMap stores={stores} />
            {stores.some((s) => s.latitude === null || s.longitude === null) && (
              <p className="mt-2 text-xs text-ink-soft">{t("mapMissing", { count: stores.filter((s) => s.latitude === null || s.longitude === null).length })}</p>
            )}
          </div>
        )}
        <div className={`mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${mapView ? "hidden" : ""}`}>
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        {(hasNext || hasPrevious) && (
          <nav aria-label={t("paginationLabel")} className="mt-10 flex items-center justify-center gap-3">
            {hasPrevious && (
              <Link href={buildFilterUrl({ page: String(page - 1) })} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                &larr;
              </Link>
            )}
            <span className="text-sm text-ink-muted">{page}</span>
            {hasNext && (
              <Link href={buildFilterUrl({ page: String(page + 1) })} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                &rarr;
              </Link>
            )}
          </nav>
        )}
        </>
      )}
    </div>
  );
}
