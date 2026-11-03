import Link from "next/link";
import { Heart, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getWishlist } from "@/lib/wishlist-api";
import { getBrandNameMap } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { EmptyState } from "@/components/ui";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";

export async function generateMetadata() {
  const t = await getTranslations("wishlist");
  return { title: t("title") };
}

export default async function WishlistPage() {
  const t = await getTranslations("wishlist");
  const tNav = await getTranslations("navigation");
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
        <div className="nz-glass-strong rounded-3xl p-6 text-center sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-500 dark:text-rose-400">
            <Heart className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("loginPrompt")}</p>
          <Link href={`/login?next=${encodeURIComponent("/wishlist")}`} className="nz-telegram-btn mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white">
            <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            {tNav("signInCta")}
          </Link>
          <Link href="/products" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {tNav("catalog")} &rarr;
          </Link>
        </div>
      </div>
    );
  }

  let items;
  let brandNames: Record<string, string> = {};
  try {
    items = await getWishlist(accessToken);
    brandNames = await getBrandNameMap();
  } catch {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-red-600 dark:text-red-400">{t("loadError")}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="nz-glass flex h-11 w-11 items-center justify-center rounded-xl text-red-500 dark:text-red-400">
          <Heart className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
          <p className="text-sm text-ink-muted">{t("itemCount", { count: items.length })}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t("empty")}
            icon={<Heart className="h-10 w-10" strokeWidth={1.25} />}
            action={
              <Link href="/products" className="text-sm font-medium text-primary transition-colors hover:brightness-110">
                {t("browseCatalog")}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid>
            {items.map((item) => (
              <ProductCard key={item.id} product={item} brandName={brandNames[item.brand_id ?? ""] ?? null} initialWishlisted />
            ))}
          </ProductGrid>
        </div>
      )}
    </div>
  );
}
