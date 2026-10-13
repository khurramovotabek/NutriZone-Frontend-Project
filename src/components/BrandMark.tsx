"use client";

import { useBrand } from "@/components/BrandContext";

/**
 * The brand's square mark: the uploaded logo when there is one, otherwise the brand's first letter
 * on the brand gradient. Size / radius come from `className`.
 */
export default function BrandMark({ className = "h-8 w-8 rounded-xl text-sm" }: { className?: string }) {
  const brand = useBrand();
  if (brand.logoUrl) {
    return (
      <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logo on a per-environment media host */}
        <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain" />
      </span>
    );
  }
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden nz-cta font-black ${className}`}>{(brand.shortName || brand.name).trim().charAt(0).toUpperCase()}</span>;
}
