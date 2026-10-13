import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Eye, Newspaper } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBlogPosts, type BlogPostCard } from "@/lib/api";
import FullBleedImage from "@/components/FullBleedImage";
import SectionHeader from "@/components/SectionHeader";

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function Meta({ post, locale, minutes, light = false }: { post: BlogPostCard; locale: string; minutes: string | null; light?: boolean }) {
  const date = formatDate(post.published_at, locale);
  const tone = light ? "text-white/75" : "text-ink-soft";
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${tone}`}>
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
          {date}
        </span>
      )}
      {minutes && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
          {minutes}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
        {post.view_count}
      </span>
    </div>
  );
}

/**
 * The journal on the home page: the newest article as a large magazine-style feature (cover, category, summary,
 * reading time), the next ones as a compact side list. One article fills the row on its own -- never a lonely card.
 */
export default async function BlogSection() {
  const t = await getTranslations("home.blog");
  const locale = await getLocale();

  let posts: BlogPostCard[];
  try {
    posts = (await getBlogPosts(4)).data;
  } catch {
    return null;
  }
  if (posts.length === 0) return null;

  const [lead, ...rest] = posts;
  const minutes = (p: BlogPostCard) => (p.reading_minutes ? t("minutes", { count: p.reading_minutes }) : null);

  return (
    <section className="mt-16">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} viewAllHref="/blog" viewAllLabel={t("viewAll")} />

      <div className={`mt-6 grid gap-6 ${rest.length ? "lg:grid-cols-[1.35fr_1fr]" : ""}`}>
        {/* Featured article */}
        <Link
          href={`/blog/${lead.slug}`}
          className={`nz-glass nz-glass-interactive group grid overflow-hidden rounded-3xl ${rest.length ? "" : "md:grid-cols-[1.1fr_1fr]"}`}
        >
          <div className={`relative overflow-hidden bg-surface-2 ${rest.length ? "aspect-[16/9]" : "aspect-[16/10] md:aspect-auto md:min-h-[340px]"}`}>
            <FullBleedImage
              src={lead.cover_image_url}
              alt={lead.title}
              sizes="(max-width: 1024px) 100vw, 700px"
              className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              fallbackIcon={<Newspaper className="h-12 w-12 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span className="absolute left-4 top-4 flex items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-contrast shadow-lg">{t("latest")}</span>
              {lead.category && <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">{lead.category}</span>}
            </span>
          </div>
          <div className="flex flex-col p-6 sm:p-8">
            <Meta post={lead} locale={locale} minutes={minutes(lead)} />
            <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-ink transition-colors group-hover:text-primary sm:text-3xl">{lead.title}</h3>
            {lead.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted sm:text-base">{lead.excerpt}</p>}
            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-primary">
              {t("read")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.25} aria-hidden="true" />
            </span>
          </div>
        </Link>

        {/* More articles */}
        {rest.length > 0 && (
          <ul className="flex flex-col gap-4">
            {rest.map((post) => (
              <li key={post.id} className="flex-1">
                <Link href={`/blog/${post.slug}`} className="nz-glass nz-glass-interactive group flex h-full items-stretch gap-4 overflow-hidden rounded-2xl p-3">
                  <span className="relative block aspect-[16/10] w-32 shrink-0 self-center overflow-hidden rounded-xl bg-surface-2 sm:w-40">
                    <FullBleedImage src={post.cover_image_url} alt="" sizes="160px" className="transition-transform duration-500 group-hover:scale-105" fallbackIcon={<Newspaper className="h-6 w-6 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                    {post.category && <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{post.category}</span>}
                    <span className="mt-1 line-clamp-2 font-bold leading-snug text-ink transition-colors group-hover:text-primary">{post.title}</span>
                    <span className="mt-auto pt-2">
                      <Meta post={post} locale={locale} minutes={minutes(post)} />
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 self-start text-ink-soft transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
