import type { ReactNode } from "react";

/**
 * The one reusable grid every product listing renders into (Featured,
 * Best Sellers, Catalog, Related Products, Wishlist, Store Products,
 * search results) -- so column-count decisions live in exactly one
 * place instead of being copy-pasted (and silently drifting) per page.
 * `dense` is for compact rails (Related Products, Store Products)
 * that want one extra column at each breakpoint since `variant="compact"`
 * cards are visually smaller.
 *
 * Capped one column lower at every breakpoint than before (never past
 * 4 even on very wide screens) so each card gets meaningfully more
 * width for its product photo instead of the grid packing in one more
 * ever-narrower column.
 */
export default function ProductGrid({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-5 sm:grid-cols-3 ${dense ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4"}`}>{children}</div>
  );
}
