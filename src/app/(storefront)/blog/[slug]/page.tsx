import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import { ChevronRight, Clock, Eye, Newspaper } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ApiError, getBlogPostBySlug } from "@/lib/api";
import { ErrorState } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: post } = await getBlogPostBySlug(slug, await getLocale());
    return pageMetadata({ path: `/blog/${post.slug}`, title: post.title, description: post.excerpt || undefined, image: post.cover_image_url ?? null, type: "article" });
  } catch {
    return { title: (await getTranslations("meta"))("blog") };
  }
}

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Real, backend-driven Blog article page -- fetches the real post
 * body from the same content API the homepage's Blog cards and the
 * /blog listing page use. A missing/unpublished slug produces a
 * real Next.js 404, never a fabricated placeholder article.
 */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("blog");
  const locale = await getLocale();

  let post;
  try {
    const result = await getBlogPostBySlug(slug, locale);
    post = result.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    return <ErrorState message={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/blog" className="transition-colors hover:text-primary">
          {t("title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="line-clamp-1 text-ink-muted">{post.title}</span>
      </nav>

      {post.category && <span className="mb-3 inline-block rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{post.category}</span>}

      <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{post.title}</h1>

      <div className="mt-3 flex items-center gap-4 text-sm text-ink-soft">
        {formatDate(post.published_at, locale) && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {formatDate(post.published_at, locale)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {t("viewCount", { count: post.view_count })}
        </span>
      </div>

      <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2">
        <MediaImage
          src={post.cover_image_url}
          alt={post.title}
          fit="cover"
          loading="eager"
          sizes="(max-width: 768px) 100vw, 768px"
          fallbackIcon={<Newspaper className="h-10 w-10 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
        />
      </div>

      <ArticleBody body={post.body} />

      <div className="mt-10 border-t border-border pt-6">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          {t("backToBlog")}
        </Link>
      </div>
    </div>
  );
}
