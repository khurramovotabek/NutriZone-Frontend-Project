import type { StoreDetail, StoreListItem } from "@/lib/store-api";
import { localizedPath, type Locale } from "@/i18n/config";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { resolveImageUrl } from "@/lib/media";
import { clip } from "@/lib/seo";

const DAY_NAMES: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

/**
 * A branch as a schema.org local business: address, map point, phone, opening hours and rating. Search
 * engines use this (together with Google Business Profile / Yandex Business) to show the branch on the map
 * and in "near me" results; every branch points back to the one store organization (@id on the home page).
 */
export function storeJsonLd(store: StoreListItem | StoreDetail, locale: Locale, brandName: string): Record<string, unknown> {
  const detail = "working_hours" in store ? (store as StoreDetail) : null;
  const url = absoluteUrl(localizedPath(`/store/${store.slug}`, locale));
  const phones = detail?.phone_numbers?.length ? detail.phone_numbers : store.phone ? [store.phone] : [];
  const image = [store.cover_image_url, store.logo_url, ...(detail?.media ?? []).filter((m) => !m.is_video).map((m) => m.url)]
    .map((u) => resolveImageUrl(u))
    .filter((u): u is string => Boolean(u))
    .slice(0, 5);
  const hours = detail
    ? Object.entries(detail.working_hours ?? {})
        .filter(([day, h]) => DAY_NAMES[day] && h && !h.closed && h.open && h.close)
        .map(([day, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${DAY_NAMES[day]}`, opens: h.open, closes: h.close }))
    : [];
  const special = (detail?.upcoming_special_days ?? detail?.special_hours ?? []).slice(0, 10).map((d) => ({
    "@type": "OpeningHoursSpecification",
    validFrom: d.date,
    validThrough: d.date,
    ...(d.closed || !d.open || !d.close ? { opens: "00:00", closes: "00:00" } : { opens: d.open, closes: d.close }),
  }));
  const sameAs = [
    detail?.instagram_username ? `https://instagram.com/${detail.instagram_username.replace(/^@/, "")}` : null,
    detail?.telegram_username ? `https://t.me/${detail.telegram_username.replace(/^@/, "")}` : null,
  ].filter(Boolean);
  const hasGeo = store.latitude != null && store.longitude != null;
  return {
    "@context": "https://schema.org",
    "@type": ["Store", "SportingGoodsStore"],
    "@id": `${url}#store`,
    name: store.name.toLowerCase().includes(brandName.toLowerCase()) ? store.name : `${brandName} — ${store.name}`,
    url,
    ...(detail?.description || store.tagline ? { description: clip(detail?.description || store.tagline || "", 300) } : {}),
    ...(image.length ? { image } : {}),
    ...(phones.length ? { telephone: phones[0] } : {}),
    ...(detail?.email ? { email: detail.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(store.address ? { streetAddress: store.address } : {}),
      ...(store.city ? { addressLocality: store.city } : {}),
      ...(store.district ? { addressRegion: store.district } : {}),
      addressCountry: "UZ",
    },
    ...(hasGeo ? { geo: { "@type": "GeoCoordinates", latitude: store.latitude, longitude: store.longitude }, hasMap: `https://yandex.uz/maps/?pt=${store.longitude},${store.latitude}&z=17&l=map` } : {}),
    ...(hours.length || special.length ? { openingHoursSpecification: [...hours, ...special] } : {}),
    ...(store.rating_count > 0 && store.rating_average ? { aggregateRating: { "@type": "AggregateRating", ratingValue: store.rating_average, reviewCount: store.rating_count, bestRating: 5, worstRating: 1 } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    priceRange: "$$",
    currenciesAccepted: "UZS",
    paymentAccepted: "Cash, Credit Card",
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };
}

export default function StoreJsonLd({ stores, locale, brandName }: { stores: (StoreListItem | StoreDetail)[]; locale: Locale; brandName: string }) {
  const visible = stores.filter((s) => s.status !== "inactive");
  if (!visible.length) return null;
  const data = visible.map((s) => storeJsonLd(s, locale, brandName));
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, "\\u003c") }} />;
}
