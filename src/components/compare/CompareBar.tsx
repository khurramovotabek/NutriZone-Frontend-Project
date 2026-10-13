"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { compareHref, setCompare, useCompareList } from "@/lib/compare";

/**
 * Floating "Solishtirish (n)" pill while the compare list has products (hidden on the compare page itself).
 * Sits above the product page's mobile buy bar.
 */
export default function CompareBar() {
  const t = useTranslations("compare");
  const list = useCompareList();
  const pathname = usePathname();
  if (!list.length || pathname === "/compare") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 sm:bottom-6 sm:justify-end sm:pl-6 sm:pr-28">
      <div className="nz-glass-strong animate-nz-fade-in pointer-events-auto flex items-center gap-1 rounded-full p-1 shadow-lg">
        <Link href={compareHref(list)} className="nz-cta flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
          <Scale className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("bar", { count: list.length })}
        </Link>
        <button type="button" onClick={() => setCompare([])} aria-label={t("clear")} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
