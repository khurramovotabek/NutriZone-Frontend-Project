import Link from "next/link";
import { BookOpen, Coins, LayoutGrid, Package, Percent, Tag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/api";
import FullBleedImage from "@/components/FullBleedImage";
import { categoryPath } from "@/lib/entity-paths";

/**
 * The quick-navigation rail right under the hero: the catalogue, every top-level category (with its photo) and the
 * storefront's other doors (brands, branches, coins). Never empty -- even with one category it reads as a menu.
 */
export default async function QuickNav() {
  const t = await getTranslations("home.quickNav");
  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];
  try {
    categories = (await getCategories(await getLocale())).data.filter((c) => !c.parent_id);
  } catch {
    categories = [];
  }

  const doors = [
    { href: "/brands", label: t("brands"), icon: Tag, tone: "from-violet-500 to-indigo-600" },
    { href: "/products?sale=1", label: t("sale"), icon: Percent, tone: "from-rose-500 to-pink-600" },
    { href: "/loyalty", label: t("coins"), icon: Coins, tone: "from-amber-400 to-orange-500" },
    { href: "/guides", label: t("guides"), icon: BookOpen, tone: "from-sky-500 to-cyan-600" },
  ];

  // Marketplace-style category doors: an icon tile with the label under it. Phones swipe one row of them (Uzum /
  // Wildberries habit); wider screens lay them out as one even row instead of two ragged centred lines of pills.
  const tile = "nz-glass nz-glass-interactive group flex h-full w-[84px] flex-col items-center gap-2 rounded-2xl px-1.5 pb-2.5 pt-2 text-center sm:w-auto";
  const label = "line-clamp-2 text-[11px] font-semibold leading-tight text-ink group-hover:text-primary sm:text-xs";
  return (
    <nav aria-label={t("label")} className="scrollbar-none mt-5 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mt-6 sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-2.5 sm:grid sm:min-w-0 sm:gap-3" style={{ gridTemplateColumns: `repeat(${1 + categories.length + doors.length}, minmax(0, 1fr))` }}>
        <li>
          <Link href="/products" className={tile}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-primary text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
              <LayoutGrid className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className={label}>{t("all")}</span>
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={categoryPath(c)} className={tile}>
              <span className="relative h-12 w-12 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-ink/5">
                <FullBleedImage src={c.image_url} alt="" sizes="48px" className="transition-transform duration-300 group-hover:scale-110" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
              </span>
              <span className={label}>{c.name}</span>
            </Link>
          </li>
        ))}
        {doors.map(({ href, label: text, icon: Icon, tone }) => (
          <li key={href}>
            <Link href={href} className={tile}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${tone}`}>
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className={label}>{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
