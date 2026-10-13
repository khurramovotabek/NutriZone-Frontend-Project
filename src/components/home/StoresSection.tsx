import Link from "next/link";
import { ArrowRight, MapPin, Star, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getStores } from "@/lib/store-api";
import FullBleedImage from "@/components/FullBleedImage";
import SectionHeader from "@/components/SectionHeader";

/** Our branches: buy online or come in -- the same catalogue, prices and coins at every branch kassa. */
export default async function StoresSection() {
  const t = await getTranslations("home.stores");
  let data: Awaited<ReturnType<typeof getStores>> | null = null;
  try {
    data = await getStores();
  } catch {
    return null;
  }
  const stores = (data?.results ?? []).filter((s) => s.status !== "inactive").slice(0, 3);
  if (stores.length === 0) return null;
  const openNow = data?.open_now_count ?? stores.filter((s) => s.is_open_now).length;

  return (
    <section className="mt-16">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle", { count: data?.count ?? stores.length, open: openNow })} viewAllHref="/stores" viewAllLabel={t("viewAll")} />
      <ul className={`mt-6 grid gap-5 ${stores.length === 1 ? "sm:grid-cols-1" : stores.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {stores.map((s) => (
          <li key={s.id}>
            <Link href={`/store/${s.slug}`} className="nz-glass nz-glass-interactive group flex h-full overflow-hidden rounded-3xl max-sm:flex-col">
              <span className={`relative block shrink-0 overflow-hidden bg-gradient-to-br from-emerald-500/30 to-primary/30 ${stores.length === 1 ? "sm:w-2/5" : "sm:w-44"} max-sm:aspect-[16/9]`}>
                <FullBleedImage src={s.cover_image_url || s.logo_url} alt="" sizes="(max-width: 640px) 100vw, 320px" className="transition-transform duration-500 group-hover:scale-105" fallbackIcon={<Store className="h-10 w-10 text-white/70" strokeWidth={1.5} aria-hidden="true" />} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col p-5">
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.is_open_now ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface-2 text-ink-soft"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.is_open_now ? "bg-emerald-500" : "bg-ink-soft"}`} />
                    {s.status === "coming_soon" ? t("soon") : s.is_open_now ? t("open") : t("closed")}
                  </span>
                  {s.rating_count > 0 && s.rating_average !== null && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
                      {s.rating_average.toFixed(1)}
                    </span>
                  )}
                </span>
                <span className="mt-2 text-lg font-bold text-ink group-hover:text-primary">{s.name}</span>
                <span className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden="true" />
                  <span className="line-clamp-2">{[s.address, s.district, s.city].filter(Boolean).join(", ") || "—"}</span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
                  {t("visit")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
