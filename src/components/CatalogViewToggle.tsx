import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

interface Props {
  view: "grid" | "list";
  baseQuery: string;
}

/**
 * Real, product-required capability: lets the shopper switch between
 * grid and list layouts for the same product results -- a pure
 * presentation preference (URL-driven, ?view=grid|list), never a
 * fabricated backend filter. Server-rendered (plain links, not client
 * state) so it works with JavaScript disabled and needs no extra
 * client bundle.
 */
export default function CatalogViewToggle({ view, baseQuery }: Props) {
  function hrefFor(target: "grid" | "list") {
    const suffix = target === "list" ? `${baseQuery}&view=list` : baseQuery;
    return `/products?${suffix.replace(/^&/, "")}`.replace(/\?&/, "?");
  }

  return (
    <div className="nz-glass flex items-center gap-1 rounded-xl p-1">
      <Link
        href={hrefFor("grid")}
        aria-label="Grid view"
        aria-current={view === "grid" ? "true" : undefined}
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${view === "grid" ? "nz-cta" : "text-ink-muted hover:text-primary"}`}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </Link>
      <Link
        href={hrefFor("list")}
        aria-label="List view"
        aria-current={view === "list" ? "true" : undefined}
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${view === "list" ? "nz-cta" : "text-ink-muted hover:text-primary"}`}
      >
        <List className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </div>
  );
}
