import { GET as llmsIndex } from "../llms.txt/route";
import { getGuide, getGuidesFull, plainAnswer } from "@/lib/guides-api";
import { absoluteUrl } from "@/lib/site-url";
import { localizedPath } from "@/i18n/config";

/**
 * /llms-full.txt (llmstxt.org): the /llms.txt map followed by the full text of every expert guide in English, so an
 * AI answer engine can quote NutriZone's advice (dosing, safety, delivery, returns) without crawling 500 pages.
 */
export const revalidate = 86400;

type FullGuide = { slug: string; title: string; answer: string; questions: string[] };

/** A guide's text: the one-call listing carries it; an older backend without `full=1` is read guide by guide. */
async function withText(g: { slug: string; title: string; answer?: string; questions?: string[] }): Promise<FullGuide | null> {
  if (g.answer) return { slug: g.slug, title: g.title, answer: g.answer, questions: g.questions ?? [] };
  const d = await getGuide(g.slug, "en").catch(() => null);
  return d ? { slug: d.slug, title: d.title, answer: d.answer, questions: d.questions } : null;
}

function guideBlock(g: FullGuide): string {
  // whole questions people type, not the one-word search keys
  const asked = g.questions.filter((q) => q.split(/\s+/).length >= 3).slice(0, 6).map((q) => `- ${q}`);
  return [`### ${g.title}`, `Source: ${absoluteUrl(localizedPath(`/guides/${g.slug}`, "en"))}`, "", plainAnswer(g.answer), ...(asked.length ? ["", "People ask:", ...asked] : []), ""].join("\n");
}

export async function GET() {
  const [index, cards] = await Promise.all([llmsIndex().then((r) => r.text()), getGuidesFull("en").catch(() => [])]);
  const guides: FullGuide[] = [];
  for (const c of cards) {
    const g = await withText(c);
    if (g) guides.push(g);
  }
  const body = [index.trimEnd(), "", `## Expert guides — full text (English, ${guides.length})`, "", ...guides.map(guideBlock)].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
