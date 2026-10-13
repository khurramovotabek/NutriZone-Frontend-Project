import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }): Promise<Metadata> {
  const [t, { orderNumber }] = await Promise.all([getTranslations("meta"), params]);
  return { title: t("order", { number: decodeURIComponent(orderNumber) }), robots: { index: false, follow: false } };
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
