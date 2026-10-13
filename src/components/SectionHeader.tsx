import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The one reusable heading for every product rail/section (Featured,
 * Best Sellers, Related Products, ...) -- icon + title (+ optional
 * subtitle) on the left, a "View all" link with a subtle
 * hover-arrow-shift on the right. Every string is caller-supplied
 * (already-translated) rather than a new generic i18n key, since each
 * section already has its own distinct copy (e.g. home.bestSellers.viewAll)
 * -- this only standardizes the layout, never the wording.
 */
export default function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
}: {
  icon?: ReactNode;
  /** Small uppercase kicker above the title (home page sections). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {viewAllHref && viewAllLabel && (
        <Link href={viewAllHref} className="group/viewall flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:brightness-110">
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover/viewall:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
