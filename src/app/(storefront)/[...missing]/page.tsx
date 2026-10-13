import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meta"))("notFound"), robots: { index: false, follow: false } };
}

/**
 * Any URL no other route claims lands here and hands over to the storefront 404 -- rendered inside the
 * storefront layout (header, search, footer) instead of Next's bare, unbranded root 404.
 */
export default function MissingPage() {
  notFound();
}
