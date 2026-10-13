import type { CatalogSort } from "@/lib/api";

/**
 * The catalog's whole filter/sort state lives in the URL, so a filtered
 * view is shareable, back/forward works, and the server page renders it
 * directly. One parser + one href builder, shared by the server page and
 * the client filter panel, so both always agree on the format:
 *
 *   /products?q=&category=&brand=a,b&flavour=x,y&size=250g,2270g
 *            &min=100000&max=500000&rating=4&stock=1&sale=1&sort=-price&view=list&page=2
 */
export const GOAL_CODES = ["muscle", "weight_loss", "endurance", "health"] as const;
export type GoalCode = (typeof GOAL_CODES)[number];

export interface CatalogState {
  q?: string;
  category?: string;
  brands: string[];
  flavours: string[];
  sizes: string[];
  /** Training goals ("muscle", "weight_loss", "endurance", "health") -- shop by goal. */
  goals: string[];
  min?: string;
  max?: string;
  rating?: number;
  stock: boolean;
  /** Only marked-down products. */
  sale: boolean;
  sort?: CatalogSort;
  view?: "list";
  page: number;
}

const SORTS: CatalogSort[] = ["relevance", "-created_at", "price", "-price", "-rating", "-popularity", "-discount", "name"];

function list(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function number(raw: string | undefined): string | undefined {
  const cleaned = (raw ?? "").replace(/[^\d.]/g, "");
  return cleaned && Number.isFinite(Number(cleaned)) ? cleaned : undefined;
}

export function parseCatalogParams(params: Record<string, string | undefined>): CatalogState {
  const rating = Number(params.rating);
  return {
    q: params.q?.trim() || undefined,
    category: params.category || undefined,
    brands: list(params.brand),
    flavours: list(params.flavour),
    sizes: list(params.size),
    goals: list(params.goal).filter((g) => GOAL_CODES.includes(g as GoalCode)),
    min: number(params.min),
    max: number(params.max),
    rating: rating >= 1 && rating <= 5 ? Math.floor(rating) : undefined,
    stock: params.stock === "1",
    sale: params.sale === "1",
    sort: SORTS.includes(params.sort as CatalogSort) ? (params.sort as CatalogSort) : undefined,
    view: params.view === "list" ? "list" : undefined,
    page: Math.max(1, Number(params.page) || 1),
  };
}

/** Href for `state` with `changes` applied. Any filter change resets to page 1 unless `page` itself is being changed. */
export function catalogHref(state: CatalogState, changes: Partial<CatalogState> = {}): string {
  const next = { ...state, ...changes, page: changes.page ?? 1 };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.category) p.set("category", next.category);
  if (next.brands.length) p.set("brand", next.brands.join(","));
  if (next.flavours.length) p.set("flavour", next.flavours.join(","));
  if (next.sizes.length) p.set("size", next.sizes.join(","));
  if (next.goals.length) p.set("goal", next.goals.join(","));
  if (next.min) p.set("min", next.min);
  if (next.max) p.set("max", next.max);
  if (next.rating) p.set("rating", String(next.rating));
  if (next.stock) p.set("stock", "1");
  if (next.sale) p.set("sale", "1");
  if (next.sort) p.set("sort", next.sort);
  if (next.view) p.set("view", next.view);
  if (next.page > 1) p.set("page", String(next.page));
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function activeFilterCount(state: CatalogState): number {
  return (state.category ? 1 : 0) + state.brands.length + state.flavours.length + state.sizes.length + state.goals.length + (state.min || state.max ? 1 : 0) + (state.rating ? 1 : 0) + (state.stock ? 1 : 0) + (state.sale ? 1 : 0);
}
