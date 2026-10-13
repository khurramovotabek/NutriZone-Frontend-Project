import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * `generateMetadata` for a segment whose page is a client component (and so can't export metadata itself):
 * a localized title from the `meta` messages. Private pages (cart, account, orders...) are kept out of search indexes.
 */
export function segmentMetadata(key: string, { indexable = false }: { indexable?: boolean } = {}) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("meta");
    return indexable ? { title: t(key) } : { title: t(key), robots: { index: false, follow: false } };
  };
}
