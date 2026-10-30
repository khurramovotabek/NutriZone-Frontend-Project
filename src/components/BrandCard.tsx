"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Brand } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import { brandPath } from "@/lib/entity-paths";

const BRAND_IMAGE_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px";

/**
 * The one reusable Brand card -- Brands List, "Other Brands" on a Brand
 * Detail page, anywhere else a brand needs representing. Logo on white
 * (see BrandLogo), name, a two-line description when the brand has one,
 * and its published product count (from `GET /brands` itself).
 */
export default function BrandCard({ brand, productCount, priority = false }: { brand: Brand; productCount?: number | null; priority?: boolean }) {
  const t = useTranslations("brands");
  const count = productCount ?? brand.product_count ?? null;

  return (
    <Link href={brandPath(brand)} className="group block h-full">
      <article className="nz-glass nz-glass-interactive flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border/60">
          <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <BrandLogo name={brand.name} logoUrl={brand.logo_url} padding="p-6" textSize="text-3xl" sizes={BRAND_IMAGE_SIZES} loading={priority ? "eager" : "lazy"} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink transition-colors group-hover:text-primary">{brand.name}</p>
          {brand.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{brand.description}</p>}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {count != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                <Package className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                {t("productCount", { count })}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary transition-all group-hover:bg-primary group-hover:text-white">
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
