/**
 * Premium key/value composition (nutrition-style) table -- backed
 * entirely by `Product.specifications` (a real, existing backend
 * JSONField: `list[{"key","value","spec_type","sort_order"}]`,
 * already publicly exposed by `GET /products/{slug}`). No second data
 * source, no fabricated values: an empty list renders nothing here --
 * the caller decides the empty-state copy (matches every other
 * "gracefully disappear when absent" section on this page).
 *
 * One row per entry: side-by-side on tablet/desktop, stacked
 * (key above value) on narrow phones -- both from the same markup via
 * a single `flex-col sm:flex-row` row, not two duplicated layouts.
 */
export default function CompositionTable({ rows }: { rows: { key: string; value: string }[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="nz-glass overflow-hidden rounded-xl">
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <dt className="text-sm text-ink-muted">{row.key}</dt>
            <dd className="text-sm font-semibold text-ink sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
