import { useTranslations } from "next-intl";

const DOT_TONE: Record<string, string> = {
  in_stock: "bg-success",
  low_stock: "bg-amber-500",
  out_of_stock: "bg-red-500",
};

const TEXT_TONE: Record<string, string> = {
  in_stock: "text-success",
  low_stock: "text-amber-700 dark:text-amber-300",
  out_of_stock: "text-red-600 dark:text-red-400",
};

/**
 * Real per-variant availability -- never a fabricated "In Stock" shown
 * unconditionally. Shows the real count ("95 in stock" / "Only 3 left")
 * whenever the backend provides one (product decision: counts are
 * public, see selectors.py::_bulk_variant_stock_status). Communicates status by label
 * text as well as color/dot, not color alone (WCAG).
 */
export default function StockStatus({ status, quantity, className = "" }: { status: "in_stock" | "low_stock" | "out_of_stock"; quantity: number | null; className?: string }) {
  const t = useTranslations("product");
  const label =
    status === "out_of_stock"
      ? t("outOfStock")
      : status === "low_stock"
        ? t("lowStockLeft", { count: quantity ?? 0 })
        : quantity != null
          ? t("stockLeft", { count: quantity })
          : t("inStock");

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${TEXT_TONE[status]} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[status]}`} />
      {label}
    </span>
  );
}
