import Link from "next/link";
import { Coins, LayoutGrid, Package, Store, Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/api";
import FullBleedImage from "@/components/FullBleedImage";

/**
 * The quick-navigation rail right under the hero: the catalogue, every top-level category (with its photo) and the
 * storefront's other doors (brands, branches, coins). Never empty -- even with one category it reads as a menu.
 */
export default async function QuickNav() {
  const t = await getTranslations("home.quickNav");
  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];
  try {
    categories = (await getCategories()).data.filter((c) => !c.parent_id);
  } catch {
    categories = [];
  }

  const doors = [
    { href: "/brands", label: t("brands"), icon: Tag, tone: "from-violet-500 to-indigo-600" },
    { href: "/stores", label: t("stores"), icon: Store, tone: "from-emerald-500 to-teal-600" },
    { href: "/loyalty", label: t("coins"), icon: Coins, tone: "from-amber-400 to-orange-500" },
  ];

  return (
    <nav aria-label={t("label")} className="scrollbar-none mt-6 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-3 sm:min-w-0 sm:flex-wrap sm:justify-center">
        <li>
          <Link href="/products" className="nz-glass nz-glass-interactive group flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-primary text-white shadow-md shadow-primary/25">
              <LayoutGrid className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-ink group-hover:text-primary">{t("all")}</span>
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/categories/${c.id}`} className="nz-glass nz-glass-interactive group flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
              <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-surface-2">
                <FullBleedImage src={c.image_url} alt="" sizes="44px" className="transition-transform duration-300 group-hover:scale-110" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
              </span>
              <span className="text-sm font-semibold text-ink group-hover:text-primary">{c.name}</span>
            </Link>
          </li>
        ))}
        {doors.map(({ href, label, icon: Icon, tone }) => (
          <li key={href}>
            <Link href={href} className="nz-glass nz-glass-interactive group flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${tone}`}>
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-ink group-hover:text-primary">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
