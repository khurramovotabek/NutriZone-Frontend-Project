import Link from "next/link";
import { Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui";

/** Entity-specific 404 for /brands/[id] -- an id that doesn't resolve
 * to any brand in `GET /brands` (deleted, or a real manufacturer-flagged
 * brand invisible to this public list -- see brands/[id]/page.tsx's
 * own docstring). Reuses the already-existing `catalog.brandNotFound`
 * copy instead of the generic storefront 404. */
export default async function BrandNotFound() {
  const t = await getTranslations("catalog");
  const tBrands = await getTranslations("brands");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Tag className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("brandNotFound")}</h1>
      <Link href="/brands" className="mt-6">
        <Button variant="primary">{tBrands("title")}</Button>
      </Link>
    </div>
  );
}
