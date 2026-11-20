"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCard as ProductCardData } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

/**
 * A premium liquid-glass product rail for the product page's recommendation blocks: an icon + title + subtitle
 * header, a "view all" link, and one swipeable row of compact cards (snap scrolling on phones, prev / next glass
 * buttons and a progress line on desktop). Purely presentational -- the caller passes real products only; an empty
 * list renders nothing.
 */
export default function ProductRail({
  id,
  icon,
  title,
  subtitle,
  products,
  brandNames,
  viewAllHref,
  viewAllLabel,
  prevLabel,
  nextLabel,
  tone = "primary",
}: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  brandNames: Record<string, string>;
  viewAllHref?: string;
  viewAllLabel?: string;
  prevLabel: string;
  nextLabel: string;
  tone?: "primary" | "amber" | "emerald";
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, progress: 0 });

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4, progress: max > 0 ? el.scrollLeft / max : 1 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length]);

  if (products.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const toneClass = { primary: "bg-primary-soft text-primary", amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400", emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" }[tone];
  const scrollable = !(edge.start && edge.end);

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="nz-liquid scroll-mt-24 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`} aria-hidden="true">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
        </div>
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="group/va hidden shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white sm:inline-flex">
            {viewAllLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/va:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
        {scrollable && (
          <div className="hidden shrink-0 gap-1.5 md:flex">
            <RailButton label={prevLabel} disabled={edge.start} onClick={() => scroll(-1)}>
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden="true" />
            </RailButton>
            <RailButton label={nextLabel} disabled={edge.end} onClick={() => scroll(1)}>
              <ChevronRight className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden="true" />
            </RailButton>
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <div ref={rowRef} className="nz-snap-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6">
          {products.map((product) => (
            <div key={product.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[19%]">
              <ProductCard product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} variant="compact" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {scrollable && (
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-200" style={{ width: `${Math.max(12, edge.progress * 100)}%` }} />
          </div>
        )}
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/10 px-3.5 text-[13px] font-semibold text-primary sm:hidden">
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

function RailButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="nz-glass flex h-9 w-9 items-center justify-center rounded-full text-ink transition-all hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
