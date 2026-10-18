import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBrand } from "@/lib/brand";

/**
 * `generateMetadata` for a segment whose page is a client component (and so can't export metadata itself):
 * a localized title from the `meta` messages. Private pages (cart, account, orders...) are kept out of search indexes.
 * A layout's plain-string title would stop the root "%s | Brand" template for everything below it, so the title is
 * absolute ("Title | Brand") and the segment passes the same template on to its children.
 */
export function segmentMetadata(key: string, { indexable = false }: { indexable?: boolean } = {}) {
  return async function generateMetadata(): Promise<Metadata> {
    const [t, { name }] = await Promise.all([getTranslations("meta"), getBrand()]);
    const title = { absolute: `${t(key)} | ${name}`, template: `%s | ${name}` };
    return indexable ? { title } : { title, robots: { index: false, follow: false } };
  };
}
