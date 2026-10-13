import type { ReactNode } from "react";

/**
 * The one reusable grid every brand listing renders into (Brand
 * Directory, Brand Detail's "Other Brands" rail) -- deliberately
 * separate from `ProductGrid`: a brand card's wide 16:10 logo tile
 * wants more columns at the same breakpoints than a product card's
 * square photo does, so sharing one grid would force a compromise
 * that under-serves one of the two. `dense` is for the smaller "Other
 * Brands" rail, one column narrower at the top breakpoint since it
 * shares page width with the product grid above it.
 */
export default function BrandGrid({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${dense ? "" : "2xl:grid-cols-5"}`}>{children}</div>
  );
}
