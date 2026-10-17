import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Newspaper } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBlogCategories, getBlogPosts } from "@/lib/api";
import { EmptyState, ErrorState } from "@/components/ui";
import FullBleedImage from "@/components/FullBleedImage";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo");
  return pageMetadata({ path: "/blog", title: t("blogTitle"), description: t("blogDescription") });
}
export const revalidate = 60;

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

/** Preserves the active category (if any) across pagination links -- a page-2 link must never silently drop the filter the visitor is currently browsing. */
function pageHref(page: number, categorySlug?: string): string {
  const query = new URLSearchParams();
  query.set("page", String(page));
  if (categorySlug) query.set("category", categorySlug);
  return `/blog?${query.toString()}`;
}

/**
 * Real, backend-driven Blog listing page -- apps/content was a
 * 13-line placeholder module before it was built out; this page
 * closes the last visible gap (the homepage's Blog cards already
 * linked here, but the page itself didn't exist yet).
 *
 * The category filter bar reads real BlogCategory rows via
 * `GET /content/categories` (only categories that actually have a
 * published post behind them -- never an empty tab), and filters
 * `GET /content/posts` by the real `?category=<slug>` the backend
 * now supports -- both added specifically to back this filter bar,
 * since a real BlogCategory FK already existed on BlogPost but had no
 * API surface at all before.
 */
export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const activeCategory = params.category || undefined;
  const t = await getTranslations("blog");
  const locale = await getLocale();

  let data: Awaited<ReturnType<typeof getBlogPosts>> | null = null;
  let categories: Awaited<ReturnType<typeof getBlogCategories>>["data"] = [];
  let loadError = false;

  try {
    const [postsResult, categoriesResult] = await Promise.all([getBlogPosts(12, page, activeCategory, locale), getBlogCategories(locale).catch(() => ({ data: [] }))]);
    data = postsResult;
    categories = categoriesResult.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t("title")}</h1>
        {!loadError && data && data.pagination && data.pagination.total_count > 0 && (
          <p className="mt-1.5 text-sm text-ink-soft">{t("resultCount", { count: data.pagination.total_count })}</p>
        )}
      </div>

      {!loadError && categories.length > 0 && (
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t("title")}>
          <Link
            href="/blog"
            role="tab"
            aria-selected={!activeCategory}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${!activeCategory ? "nz-cta" : "nz-glass text-ink-muted"}`}
          >
            {t("allCategories")}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/blog?category=${encodeURIComponent(category.slug)}`}
              role="tab"
              aria-selected={activeCategory === category.slug}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${
                activeCategory === category.slug ? "nz-cta" : "nz-glass text-ink-muted"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {loadError && <ErrorState message={t("error")} />}

      {!loadError && data && data.data.length === 0 && (
        <EmptyState icon={<Newspaper className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />} title={t("empty")} />
      )}

      {!loadError && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="nz-glass-interactive group overflow-hidden rounded-xl">
                <div className="relative aspect-video overflow-hidden bg-surface-2">
                  <FullBleedImage
                    src={post.cover_image_url}
                    alt={post.title}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    className="transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    fallbackIcon={<Newspaper className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
                  />
                  {post.category && <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">{post.category}</span>}
                </div>
                <div className="p-5">
                  <p className="line-clamp-2 text-base font-semibold text-ink transition-colors group-hover:text-primary">{post.title}</p>
                  {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{post.excerpt}</p>}
                  <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
                    {formatDate(post.published_at, locale) && <span>{formatDate(post.published_at, locale)}</span>}
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {post.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {data.pagination && data.pagination.total_pages > 1 && (
            <nav aria-label={t("paginationLabel")} className="mt-10 flex justify-center gap-2">
              {Array.from({ length: data.pagination.total_pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p, activeCategory)}
                  aria-current={p === page ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 ${p === page ? "nz-cta" : "nz-glass text-ink-muted"}`}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
