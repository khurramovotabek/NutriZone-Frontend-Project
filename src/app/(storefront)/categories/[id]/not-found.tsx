import Link from "next/link";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui";

/** Entity-specific 404 for /categories/[id] -- an id that doesn't
 * resolve to any category in `GET /categories`. Reuses the
 * already-existing `catalog.categoryNotFound` copy instead of the
 * generic storefront 404. */
export default async function CategoryNotFound() {
  const t = await getTranslations("catalog");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Package className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("categoryNotFound")}</h1>
      <Link href="/products" className="mt-6">
        <Button variant="primary">{t("title")}</Button>
      </Link>
    </div>
  );
}
