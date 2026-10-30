import { describe, expect, it } from "vitest";
import type { ProductCard } from "@/lib/api";
import { productJsonLd } from "./ProductJsonLd";

const base = {
  id: "p1", slug: "whey", name: "Gold Whey", status: "published", brand_id: "b1", category_id: null, primary_image_path: "https://cdn.example/w.jpg",
  default_variant_id: "v1", created_at: "2026-01-01", price: "450000.00", currency: "UZS", rating_average: 4.8, rating_count: 12,
} as ProductCard;

describe("productJsonLd", () => {
  it("reads stock from the variants on a detail response", () => {
    const product = { ...base, variants: [{ id: "v1", sku: "GW-1", is_default: true, status: "active", stock_status: "in_stock", stock_quantity: 7 }] } as unknown as ProductCard;
    const ld = productJsonLd(product, "Optimum", "Best whey");
    expect(ld.sku).toBe("GW-1");
    expect(ld.offers).toMatchObject({ price: "450000", priceCurrency: "UZS", availability: "https://schema.org/InStock" });
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.8, reviewCount: 12 });
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Optimum" });
  });

  it("never invents a rating or a price", () => {
    const ld = productJsonLd({ ...base, price: null, rating_count: 0, stock_quantity: 0 }, null);
    expect(ld.offers).toBeUndefined();
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.brand).toBeUndefined();
  });

  it("marks a family of variants up as a ProductGroup, each variant with its own offer and GTIN", () => {
    const v = (id: string, flavour: string, size: number, price: string, stock: number, gtin: string | null) => ({
      id, sku: `SKU-${id}`, gtin, is_default: id === "v1", status: "active", weight_value: size, weight_unit: "g", package: null,
      flavour: { id: flavour, name: flavour, color_hex: null, image_url: null }, gallery: [], video_url: null, price, currency: "UZS", stock_status: "in_stock", stock_quantity: stock,
    });
    const product = { ...base, variants: [v("v1", "Shokolad", 900, "450000.00", 3, "4006381333931"), v("v2", "Vanil", 2270, "890000.00", 0, null)] } as unknown as ProductCard;
    const ld = productJsonLd(product, "Optimum", "Best whey") as { "@type": string; variesBy: string[]; hasVariant: Record<string, unknown>[] };
    expect(ld["@type"]).toBe("ProductGroup");
    expect(ld.variesBy).toEqual(["https://schema.org/size"]);
    expect(ld.hasVariant[0]).toMatchObject({ name: "Gold Whey (Shokolad, 900 g)", sku: "SKU-v1", gtin: "4006381333931", size: "900 g" });
    expect(ld.hasVariant[0].offers).toMatchObject({ price: "450000", availability: "https://schema.org/InStock", hasMerchantReturnPolicy: { merchantReturnDays: 14 } });
    expect(ld.hasVariant[1].gtin).toBeUndefined();
    expect(ld.hasVariant[1].offers).toMatchObject({ price: "890000", availability: "https://schema.org/OutOfStock" });
  });
});
