import CatalogPagerView from "@/components/CatalogPagerView";

export { buildCompactPageNumbers, buildPageNumbers } from "@/lib/page-numbers";

/** Server-side entry: builds every page's link with `hrefFor` (functions can't cross into the client view). */
export default function CatalogPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  hrefFor,
  label,
}: {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const hrefs = Array.from({ length: totalPages }, (_, i) => hrefFor(i + 1));
  return <CatalogPagerView page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} hrefs={hrefs} label={label} />;
}
