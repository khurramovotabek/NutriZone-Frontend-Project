import { getTranslations } from "next-intl/server";
import { getBrands } from "@/lib/api";
import BrandCard from "@/components/BrandCard";

/**
 * Real, backend-driven Popular Brands section -- BrandSelector now
 * exposes a real logo_url (Brand.logo FK existed already, but no
 * selector previously surfaced it -- confirmed and fixed this
 * phase). Rendered with the shared BrandCard (full-bleed image + name),
 * the same card as the Brands page; a brand with no uploaded logo shows
 * a neutral icon, never a fabricated placeholder image.
 */
export default async function BrandsSection() {
  const t = await getTranslations("home.brands");

  let brands;
  try {
    const result = await getBrands();
    brands = result.data;
  } catch {
    return null;
  }

  if (brands.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
    </section>
  );
}
