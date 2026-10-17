import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Phone, Mail, Send, MapPin, Star, Camera, Store as StoreIcon, Navigation, Clock, ChevronRight, User, Package, CalendarDays, Landmark, ShoppingBag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getStoreBySlug } from "@/lib/store-api";
import { ApiError, API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { resolveImageUrl } from "@/lib/media";
import MediaImage from "@/components/MediaImage";
import StoreHeroImage from "@/components/StoreHeroImage";
import StoreRatingWidget from "@/components/StoreRatingWidget";
import StoreProductSearch from "@/components/StoreProductSearch";
import ShareButton from "@/components/ShareButton";
import ProductTabs from "@/components/ProductTabs";
import MessageStoreButton from "@/components/MessageStoreButton";
import StoreGallery from "@/components/StoreGallery";
import StoreLocationMap from "@/components/StoreLocationMapLazy";
import { yandexRouteUrl } from "@/lib/maps";
import { AMENITY_ICONS } from "@/components/store-dashboard/amenities";
import { STORE_AMENITIES, type StoreAmenity } from "@/components/store-dashboard/types";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import StoreJsonLd from "@/components/StoreJsonLd";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Real, closed gap: the backend correctly rejects `POST
 * /chat/conversations/store/{id}` with "You cannot open a sales
 * conversation with your own store" when the requester IS that
 * store's owner (apps/chat/interfaces/api/v1/views.py's own
 * `OpenStoreConversationView.post`, confirmed by direct inspection) --
 * but this page rendered the "Message store" button unconditionally,
 * so a store owner previewing their own public storefront page saw a
 * button that could only ever fail. This uses the real, existing
 * `GET /api/v1/my-store` capability (confirmed field: `id`) the same
 * way the Store Dashboard itself already does -- never a new endpoint,
 * never comparing against an owner id this page's own API response
 * doesn't even expose.
 */
async function isViewingOwnStore(storeId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/my-store`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.id === storeId;
  } catch {
    return false;
  }
}

const STATUS_DOT: Record<string, string> = {
  active_open: "bg-primary",
  active_closed: "bg-white/50",
  temporarily_closed: "bg-amber-400",
  coming_soon: "bg-blue-400",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [{ data: store }, t, { name }] = await Promise.all([getStoreBySlug(slug), getTranslations("seo"), getBrand()]);
    const address = [store.address, store.city].filter(Boolean).join(", ");
    return pageMetadata({ path: `/store/${store.slug}`, title: t("storeTitle", { name: store.name }), description: store.description?.trim() || t("storeDescription", { name: store.name, address, brand: name }) });
  } catch {
    return {};
  }
}

export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("stores");
  const ta = await getTranslations("storeAmenity");
  const tNav = await getTranslations("navigation");

  let store;
  try {
    const result = await getStoreBySlug(slug);
    store = result.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const isOwnStore = await isViewingOwnStore(store.id);

  const statusKey = store.status === "temporarily_closed" || store.status === "coming_soon" ? store.status : store.is_open_now ? "active_open" : "active_closed";
  const statusLabel =
    store.status === "temporarily_closed" ? t("temporarilyClosed") : store.status === "coming_soon" ? t("comingSoon") : store.is_open_now ? t("open") : t("closed");

  const hasCoordinates = store.latitude != null && store.longitude != null;
  // Yandex route -- the navigator people in Uzbekistan actually use (Google stays one tap away in MapLinks)
  const mapUrl = hasCoordinates ? yandexRouteUrl(store.latitude!, store.longitude!) : null;
  const locationLine = [store.city, store.district].filter(Boolean).join(", ");
  const hasLocation = Boolean(store.address || locationLine || hasCoordinates);
  const hasContact = Boolean(store.phone_numbers.length > 0 || store.email || store.telegram_username || store.instagram_username);
  const firstPhone = store.phone_numbers[0] ?? null;
  const galleryItems = store.media
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ url: resolveImageUrl(item.url) ?? item.url, isVideo: item.is_video }));

  // Server-resolved "today", matching `is_open_now`'s own server-side
  // clock (the backend already computes that the same way) -- never
  // the visitor's own device clock, which could disagree with the
  // store's real, configured timezone.
  const now = new Date();
  const todayCode = WEEKDAYS[(now.getDay() + 6) % 7];
  // Real, previously-missing consistency fix: `is_open_now` (the top
  // badge) already lets a `special_hours` entry for today override
  // the regular weekly schedule, per Store.is_open_now()'s own
  // docstring -- but the Working Hours list below still showed only
  // the regular schedule, so a holiday closure would show "Closed" up
  // top while today's row underneath still said "10:00 — 20:00".
  // Surfacing today's real override here keeps both honest and
  // in agreement.
  const todayOverride = store.special_hours.find((entry) => entry.date === now.toISOString().slice(0, 10));
  const accent = store.color || "#10b981";
  const today = store.today_hours;
  const todayText = !today || store.status !== "active" ? statusLabel : today.closed ? t("dayOff") : store.is_open_now ? t("closesAt", { time: today.close }) : t("opensAt", { time: today.open });
  const upcoming = (store.upcoming_special_days ?? []).filter((d) => d.date !== now.toISOString().slice(0, 10)).slice(0, 5);
  const pageLocale = await getLocale();
  const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(pageLocale === "uz" ? "uz-Latn" : pageLocale, { day: "numeric", month: "long", weekday: "short" });

  return (
    <div className="pb-16">
      <StoreJsonLd stores={[store]} locale={pageLocale as Locale} brandName={(await getBrand()).name} />
      <nav aria-label={t("breadcrumbLabel")} className="mx-auto max-w-6xl px-4 pt-6 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <Link href="/" className="transition-colors hover:text-primary">
            {tNav("home")}
          </Link>
          <ChevronRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          <Link href="/stores" className="transition-colors hover:text-primary">
            {t("title")}
          </Link>
          <ChevronRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          <span aria-current="page" className="font-medium text-ink">
            {store.name}
          </span>
        </div>
      </nav>

      {/* Hero: identity lives INSIDE the image (bottom-anchored, gradient-protected), not squeezed into a separate bar below it. */}
      <div className="relative mt-4 h-[240px] w-full overflow-hidden sm:h-[320px] lg:h-[380px]">
        <StoreHeroImage src={store.cover_image_url} alt={store.name} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-5 sm:pb-6">
            <div className="flex items-end gap-3.5 sm:gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-white shadow-lg sm:h-20 sm:w-20" style={{ borderColor: accent, boxShadow: `0 10px 30px -10px ${accent}` }}>
                <MediaImage src={store.logo_url} alt="" fit="contain" padding="p-2" fallbackIcon={<StoreIcon className="h-7 w-7 text-white/70" strokeWidth={1.25} aria-hidden="true" />} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-white sm:text-2xl lg:text-3xl">{store.name}</h1>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[statusKey]}`} />
                    {statusLabel}
                  </span>
                </div>
                {store.tagline && <p className="mt-1 line-clamp-2 text-sm font-medium text-white/90">{store.tagline}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                  {store.rating_count > 0 && store.rating_average !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
                      <span className="font-semibold text-white">{store.rating_average.toFixed(1)}</span>
                      <span>{t("ratingCountLabel", { count: store.rating_count })}</span>
                    </span>
                  )}
                  {locationLine && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {locationLine}
                    </span>
                  )}
                  <span>{t("productsCount", { count: store.products.length })}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isOwnStore ? (
                <Link
                  href="/profile/store"
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <StoreIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {t("ownStoreBadge")}
                </Link>
              ) : (
                <MessageStoreButton
                  store={{
                    id: store.id,
                    name: store.name,
                    slug: store.slug,
                    logoUrl: store.logo_url,
                    city: store.city,
                    district: store.district,
                    address: store.address,
                    isOpenNow: store.is_open_now,
                  }}
                />
              )}
              <ShareButton title={store.name} className="!border !border-white/20 !bg-black/35 !bg-none !text-white !shadow-none backdrop-blur-sm hover:!bg-black/50 hover:!text-white" />
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <Navigation className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {t("getDirections")}
                </a>
              )}
              {firstPhone && (
                <a
                  href={`tel:${firstPhone}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {t("contact")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      <div className="mx-auto max-w-6xl px-4">
        <div className="relative z-10 -mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Clock, label: t("quickHours"), value: today && !today.closed ? `${today.open}–${today.close}` : t("closedAllDay"), sub: todayText, tone: store.is_open_now ? "#10b981" : "#64748b" },
            { icon: Package, label: t("quickProducts"), value: String(store.products.length), sub: t("productsAvailable"), tone: "#2563eb" },
            { icon: Star, label: t("quickRating"), value: store.rating_average !== null ? store.rating_average.toFixed(1) : "—", sub: store.rating_count > 0 ? t("ratingCountLabel", { count: store.rating_count }) : t("noRating"), tone: "#f59e0b" },
            { icon: MapPin, label: t("location"), value: store.city || store.district || store.address || (hasCoordinates ? t("pinnedOnMap") : "—"), sub: store.city ? store.district || store.address || "" : "", tone: accent },
          ].map(({ icon: Icon, label, value, sub, tone }) => (
            <div key={label} className="nz-glass rounded-2xl p-3.5 shadow-lg sm:p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="truncate">{label}</span>
              </div>
              <p className="mt-2 truncate text-lg font-bold tabular-nums text-ink">{value}</p>
              {sub && <p className="truncate text-xs text-ink-muted">{sub}</p>}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <ProductTabs
            tabs={[
              {
                id: "overviewTab",
                label: t("overview"),
                content: (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                      <section>
                        <h2 className="mb-2 text-base font-semibold text-ink">{t("about")}</h2>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{store.description || t("noDescription")}</p>
                        {(store.amenities?.length ?? 0) > 0 && (
                          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("amenities")}>
                            {STORE_AMENITIES.filter((a) => store.amenities?.includes(a)).map((a: StoreAmenity) => {
                              const Icon = AMENITY_ICONS[a];
                              return (
                                <li key={a} className="nz-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink">
                                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {ta(a)}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {store.pickup_enabled && store.status === "active" && (
                          <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-3 text-sm text-ink">
                            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                            <span><b>{t("pickupTitle")}</b><span className="block text-xs text-ink-muted">{t("pickupBody")}</span></span>
                          </p>
                        )}
                      </section>

                      {galleryItems.length > 0 && (
                        <section>
                          <h2 className="mb-3 text-base font-semibold text-ink">{t("gallery")}</h2>
                          <StoreGallery items={galleryItems} storeName={store.name} />
                        </section>
                      )}

                      <section>
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                          <Clock className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
                          {t("workingHours")}
                        </h2>
                        <div className="nz-glass overflow-hidden rounded-2xl">
                          {WEEKDAYS.map((code, idx) => {
                            const day = store.working_hours[code];
                            const isToday = code === todayCode;
                            // A `special_hours` entry for today's real date always wins
                            // over the regular weekly row -- matches Store.is_open_now()'s
                            // own priority order, so this row never contradicts the
                            // Open/Closed badge in the hero above.
                            const effective = isToday && todayOverride ? todayOverride : day;
                            const isClosed = !effective || effective.closed;
                            return (
                              <div
                                key={code}
                                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${idx % 2 === 1 ? "bg-surface-2/50" : ""} ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                              >
                                <span className={`font-medium ${isToday ? "text-primary" : "text-ink-muted"}`}>{t(code)}</span>
                                <span className="flex items-center gap-2">
                                  <span className={isToday ? "font-semibold text-ink" : "text-ink-muted"}>{!isClosed ? `${effective.open} — ${effective.close}` : t("closed")}</span>
                                  {isToday && todayOverride && (
                                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{t("specialToday")}</span>
                                  )}
                                  {isToday && !todayOverride && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">{t("today")}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {upcoming.length > 0 && (
                          <div className="nz-glass mt-3 rounded-2xl p-4">
                            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                              <CalendarDays className="h-4 w-4 text-amber-500" strokeWidth={1.9} aria-hidden="true" />
                              {t("upcomingSpecial")}
                            </p>
                            <ul className="space-y-1.5 text-sm">
                              {upcoming.map((d) => (
                                <li key={d.date} className="flex items-center justify-between gap-3">
                                  <span className="text-ink-muted">
                                    {fmtDate(d.date)}
                                    {d.note && <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{d.note}</span>}
                                  </span>
                                  <span className="font-medium tabular-nums text-ink">{d.closed ? t("closedAllDay") : `${d.open} — ${d.close}`}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </section>

                      {hasLocation && (
                        <section>
                          <h2 className="mb-3 text-base font-semibold text-ink">{t("location")}</h2>
                          {hasCoordinates ? (
                            <div className="space-y-3">
                              <StoreLocationMap latitude={store.latitude!} longitude={store.longitude!} storeName={store.name} address={store.address || locationLine} mapUrl={mapUrl!} />
                              {(store.address || locationLine) && (
                                <p className="flex items-start gap-2 text-sm text-ink-muted">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                                  {[store.address, locationLine].filter(Boolean).join(", ")}
                                </p>
                              )}
                              {store.landmark && (
                                <p className="flex items-start gap-2 text-sm text-ink-muted">
                                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                                  <span><b className="text-ink">{t("landmark")}:</b> {store.landmark}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="nz-glass rounded-2xl p-4">
                              <p className="flex items-start gap-2 text-sm text-ink-muted">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                                {store.address || locationLine}
                              </p>
                              <p className="mt-3 text-xs text-ink-soft">{t("noLocation")}</p>
                            </div>
                          )}
                        </section>
                      )}
                    </div>

                    <aside>
                      <div className="nz-glass rounded-2xl p-5">
                        <h2 className="mb-3 text-base font-semibold text-ink">{t("contact")}</h2>
                        {store.owner_full_name && (
                          <p className="mb-3 flex items-center gap-2.5 border-b border-border pb-3 text-sm text-ink-muted">
                            <User className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                            <span>
                              <span className="block text-xs text-ink-soft">{t("ownerLabel")}</span>
                              <span className="font-medium text-ink">{store.owner_full_name}</span>
                            </span>
                          </p>
                        )}
                        {hasContact ? (
                          <div className="space-y-3 text-sm">
                            {store.phone_numbers.map((phone) => (
                              <a key={phone} href={`tel:${phone}`} className="flex items-center gap-2.5 text-ink-muted transition-colors hover:text-primary">
                                <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                                {phone}
                              </a>
                            ))}
                            {store.email && (
                              <a href={`mailto:${store.email}`} className="flex items-center gap-2.5 text-ink-muted transition-colors hover:text-primary">
                                <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                                {store.email}
                              </a>
                            )}
                            {store.telegram_username && (
                              <a
                                href={`https://t.me/${store.telegram_username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-ink-muted transition-colors hover:text-primary"
                              >
                                <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />@{store.telegram_username}
                              </a>
                            )}
                            {store.instagram_username && (
                              <a
                                href={`https://instagram.com/${store.instagram_username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-ink-muted transition-colors hover:text-primary"
                              >
                                <Camera className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />@{store.instagram_username}
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-ink-soft">{t("noContactInfo")}</p>
                        )}
                      </div>
                    </aside>
                  </div>
                ),
              },
              {
                id: "productsTab",
                label: t("products"),
                badge: store.products.length > 0 ? `(${store.products.length})` : undefined,
                content: store.products.length === 0 ? <p className="text-sm text-ink-muted">{t("noProducts")}</p> : <StoreProductSearch products={store.products} />,
              },
              {
                id: "reviewsTab",
                label: t("reviews"),
                badge: store.rating_count > 0 ? `(${store.rating_count})` : undefined,
                content: (
                  <div className="mx-auto max-w-sm">
                    <StoreRatingWidget slug={slug} initialAverage={store.rating_average} initialCount={store.rating_count} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
