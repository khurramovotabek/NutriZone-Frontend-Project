/**
 * The site's brand (name, short name, logo, colours) -- set in Dashboard → Sozlamalar, served by
 * GET /api/v1/settings/public. Server-side only: fetched once a minute (Next's data cache), handed to
 * client components through <BrandProvider>, and swapped into every translation string ("NutriZone" →
 * the configured name) so renaming the project needs no code change.
 */
import { API_BASE_URL } from "@/lib/api";

export interface Brand {
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export const DEFAULT_BRAND_NAME = "NutriZone";
export const DEFAULT_BRAND: Brand = { name: DEFAULT_BRAND_NAME, shortName: DEFAULT_BRAND_NAME, logoUrl: null, primaryColor: null };

export async function getBrand(): Promise<Brand> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings/public`, { next: { revalidate: 60, tags: ["brand"] } });
    if (!res.ok) return DEFAULT_BRAND;
    const b = (await res.json())?.data?.brand;
    if (!b?.name) return DEFAULT_BRAND;
    return { name: b.name, shortName: b.short_name || b.name, logoUrl: b.logo_url || null, primaryColor: b.primary_color || null };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Deep-replaces the default brand in a messages tree (keys untouched). */
export function rebrandMessages<T>(tree: T, name: string): T {
  if (!name || name === DEFAULT_BRAND_NAME) return tree;
  const upper = DEFAULT_BRAND_NAME.toUpperCase();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.split(DEFAULT_BRAND_NAME).join(name).split(upper).join(name.toUpperCase());
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(tree) as T;
}
