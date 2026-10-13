import { Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { API_BASE_URL, getBrandNameMap, type ProductCard as ProductCardData } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";

type Personal = ProductCardData & { reason?: string; reason_code?: string };

/**
 * "Siz uchun" -- personal picks for a signed-in shopper (apps/products/infrastructure/personal.py): bought together
 * with what they buy, their training goal, their favourite category. Each card says why. Renders nothing for
 * guests or when there's too little to show.
 */
export default async function ForYouSection({ limit = 4 }: { limit?: number }) {
  const token = await getAccessToken();
  if (!token) return null;
  const locale = await getLocale();
  let items: Personal[] = [];
  let brandNames: Record<string, string> = {};
  try {
    const [res, brands] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/products/recommendations?filter[locale]=${encodeURIComponent(locale)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      getBrandNameMap(),
    ]);
    const body = await res.json();
    if (!res.ok || !body?.success) return null;
    items = (body.data as Personal[]).slice(0, limit);
    brandNames = brands;
  } catch {
    return null;
  }
  if (items.length < 2) return null;
  const t = await getTranslations("home.forYou");

  return (
    <section className="mt-16">
      <SectionHeader icon={<Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />} title={t("title")} viewAllHref="/products" viewAllLabel={t("viewAll")} />
      <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
      <div className="mt-4">
        <ProductGrid>
          {items.map((product) => (
            <div key={product.id} className="flex min-w-0 flex-col gap-1.5">
              <ProductCard product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} />
              {product.reason && (
                <p className="inline-flex w-fit max-w-full items-center gap-1 truncate rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{product.reason}</span>
                </p>
              )}
            </div>
          ))}
        </ProductGrid>
      </div>
    </section>
  );
}
