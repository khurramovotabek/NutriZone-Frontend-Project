import type { ApiEnvelope, Brand, Category, GoalSummary, ProductCard, SearchParams } from "@/lib/api";
import { searchQueryString } from "@/lib/api";

/** Browser-side catalog reads through the same-origin proxy (src/app/api/catalog) -- independent of backend CORS. */
async function catalogGet<T>(path: string, query = ""): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/catalog/${path}${query ? `?${query}` : ""}`);
  if (!response.ok) throw new Error(`Catalog request ${path} failed with status ${response.status}`);
  return response.json() as Promise<ApiEnvelope<T>>;
}

export const searchProductsClient = (params: SearchParams) => catalogGet<ProductCard[]>("products/search", searchQueryString(params));
export const getCategoriesClient = (locale?: string) => catalogGet<Category[]>("categories", locale ? `locale=${encodeURIComponent(locale)}` : "");
export const getGoalsClient = () => catalogGet<GoalSummary[]>("products/goals");
/** "Often bought together" with a cart's items (variant or product ids). */
export const getCartCrossSellClient = (ids: string[], locale?: string) =>
  catalogGet<ProductCard[]>("products/recommendations/for-cart", `ids=${ids.map(encodeURIComponent).join(",")}${locale ? `&filter[locale]=${encodeURIComponent(locale)}` : ""}`);
export const getPopularSearchesClient = (limit = 8) => catalogGet<string[]>("products/search/popular", `limit=${limit}`);

export async function getBrandNameMapClient(): Promise<Record<string, string>> {
  try {
    const { data } = await catalogGet<Brand[]>("brands");
    return Object.fromEntries(data.map((b) => [b.id, b.name]));
  } catch {
    return {};
  }
}
