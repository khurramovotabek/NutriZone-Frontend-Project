import Link from "next/link";
import { BadgeCheck, Package, Quote, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getFeaturedReviews } from "@/lib/api";
import FullBleedImage from "@/components/FullBleedImage";
import SectionHeader from "@/components/SectionHeader";

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-transparent text-ink-soft/40"}`} strokeWidth={s <= Math.round(value) ? 0 : 1.5} aria-hidden="true" />
      ))}
    </span>
  );
}

/** What customers say: the best published reviews (4-5 stars, a real comment) with the store-wide score. */
export default async function ReviewsWall() {
  const t = await getTranslations("home.reviews");
  const locale = await getLocale();
  let data: Awaited<ReturnType<typeof getFeaturedReviews>>["data"] | null = null;
  try {
    data = (await getFeaturedReviews(6)).data;
  } catch {
    return null;
  }
  if (!data || data.results.length === 0) return null;
  const { results, average, count } = data;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
        {average !== null && (
          <div className="nz-glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="text-3xl font-black tabular-nums text-ink">{average.toFixed(1)}</span>
            <span>
              <Stars value={average} />
              <span className="mt-0.5 block text-xs text-ink-soft">{t("basedOn", { count })}</span>
            </span>
          </div>
        )}
      </div>
      <ul className={`mt-6 grid gap-5 ${results.length === 1 ? "md:grid-cols-1" : results.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {results.map((r) => (
          <li key={r.id} className="nz-glass relative flex flex-col overflow-hidden rounded-3xl p-6">
            <Quote aria-hidden="true" className="pointer-events-none absolute right-5 top-5 h-12 w-12 text-primary/10" strokeWidth={1.5} />
            <Stars value={r.rating} />
            {r.title && <p className="mt-3 font-bold text-ink">{r.title}</p>}
            <p className={`mt-2 text-sm leading-relaxed text-ink-muted ${results.length === 1 ? "text-base" : "line-clamp-5"}`}>«{r.body}»</p>
            <div className="mt-auto flex items-center gap-3 pt-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-sm font-bold text-white">{r.author_name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  {r.author_name}
                  {r.verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      {t("verified")}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-ink-soft">{new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</span>
              </span>
            </div>
            {r.product && (
              <Link href={`/products/${r.product.slug}`} className="group mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2/40 p-2 pr-3 transition-colors hover:border-primary/40">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                  <FullBleedImage src={r.product.image_url} alt="" sizes="44px" fallbackIcon={<Package className="h-5 w-5 text-slate-300" strokeWidth={1.5} aria-hidden="true" />} />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink group-hover:text-primary">{r.product.name}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
