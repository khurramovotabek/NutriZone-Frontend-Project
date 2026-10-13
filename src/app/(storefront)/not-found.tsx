import Link from "next/link";
import { ArrowRight, Home, LayoutGrid, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Storefront-wide 404 -- `notFound()` from any route in this group without its own not-found.tsx, and every
 * unknown URL (see [...missing]). Renders inside the storefront layout, so header, search and footer stay.
 */
export default async function StorefrontNotFound() {
  const t = await getTranslations("common");
  const tNav = await getTranslations("navigation");

  const links = [
    { href: "/", icon: Home, label: tNav("homepage") },
    { href: "/products", icon: LayoutGrid, label: tNav("catalog") },
    { href: "/stores", icon: Store, label: tNav("stores") },
  ];

  return (
    <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-6 -z-10 mx-auto h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <p aria-hidden="true" className="nz-gradient-text select-none text-[7rem] font-black leading-none tracking-tighter sm:text-[9rem]">
        404
      </p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">{t("notFoundMessage")}</p>
      <ul className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-3">
        {links.map(({ href, icon: Icon, label }, i) => (
          <li key={href}>
            <Link href={href} className={`group flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${i === 0 ? "nz-cta nz-shimmer-btn" : "nz-liquid nz-liquid-tile text-ink"}`}>
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {label}
              <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
