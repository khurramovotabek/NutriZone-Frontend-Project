import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBrands } from "@/lib/api";
import FullBleedImage from "@/components/FullBleedImage";
import SectionHeader from "@/components/SectionHeader";

/** Official brands as a centred strip of logo tiles (white plates, like a shop window) -- neat with 2 brands or 20. */
export default async function BrandStrip() {
  const t = await getTranslations("home.brands");
  let brands: Awaited<ReturnType<typeof getBrands>>["data"] = [];
  try {
    brands = (await getBrands()).data;
  } catch {
    return null;
  }
  if (brands.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} viewAllHref="/brands" viewAllLabel={t("viewAll")} />
      <ul className="mt-6 flex flex-wrap justify-center gap-4">
        {brands.slice(0, 12).map((b) => (
          <li key={b.id} className="w-[calc(50%-0.5rem)] sm:w-52">
            <Link href={`/brands/${b.id}`} className="group block">
              <span className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/10">
                <FullBleedImage src={b.logo_url} alt={b.name} sizes="192px" className="p-4 transition-transform duration-300 group-hover:scale-105" fallbackIcon={<Tag className="h-8 w-8 text-slate-300" strokeWidth={1.5} aria-hidden="true" />} />
              </span>
              <span className="mt-2.5 flex items-start justify-between gap-2 px-1">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary" title={b.name}>{b.name}</span>
                  {b.product_count ? <span className="block text-xs text-ink-soft">{t("products", { count: b.product_count })}</span> : null}
                </span>
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
