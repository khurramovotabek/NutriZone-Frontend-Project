import { apiFetch } from "./api";

/** Public sports-nutrition guides = the AI advisor's knowledge base (backend apps/assistant/infrastructure/guides.py). */
export type GuideTopic = "usage" | "product" | "faq" | "policy";

export interface GuideCard {
  slug: string;
  topic: GuideTopic;
  title: string;
  summary: string;
  updated_at: string;
}

export interface GuideDetail extends GuideCard {
  answer: string;
  questions: string[];
  keywords: string;
  /** Catalogue search for the product kind the guide is about ("" when it isn't about one). */
  product_query: string;
  related: GuideCard[];
  titles: Record<"uz" | "ru" | "en", string>;
}

export async function getGuides(locale: string): Promise<GuideCard[]> {
  const res = await apiFetch<{ guides: GuideCard[] }>(`/api/v1/assistant/guides?locale=${encodeURIComponent(locale)}`);
  return res.data.guides;
}

export async function getGuide(slug: string, locale: string): Promise<GuideDetail> {
  const res = await apiFetch<GuideDetail>(`/api/v1/assistant/guides/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`);
  return res.data;
}

/** The answer as plain text (JSON-LD, meta description): no **bold** / _italic_ markers or list bullets. */
export function plainAnswer(text: string): string {
  return text.replace(/\*\*|~~/g, "").replace(/(^|\s)_([^_]+)_/g, "$1$2").replace(/^[•\-*]\s+/gm, "").replace(/\s+/g, " ").trim();
}
