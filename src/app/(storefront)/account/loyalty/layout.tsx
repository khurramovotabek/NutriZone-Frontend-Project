import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loyalty.account");
  return { title: t("title") };
}

export default function AccountLoyaltyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
