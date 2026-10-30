"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package, PlayCircle, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import MediaLightbox, { type MediaLightboxItem } from "@/components/MediaLightbox";
import ProductMediaImage from "@/components/ProductMediaImage";
import { useTabVisible } from "@/hooks/useTabVisible";
import { deriveProductThumbnail, resolveImageUrl } from "@/lib/media";

/** How long the main image stays up before auto-advancing to the next one, sort order 1 -> 2 -> 3 ... -> back to 1. Long enough to actually look at a product photo, short enough that a shopper who never touches the gallery still sees every real photo within a normal page visit. */
const AUTO_ADVANCE_MS = 4500;

/**
 * Product detail gallery -- a large main viewer with a thumbnail rail
 * (vertical on desktop, horizontal on mobile), matching the
 * established e-commerce convention. `media` is the real, backend-
 * resolved `gallery` array (primary image first, then gallery-role
 * images by sort_order -- see api.ts's own ProductCard docstring)
 * plus the selected variant's own real `video_url` appended last when
 * present -- a real, existing field this gallery previously never
 * rendered at all. A product with no media renders a single fallback
 * pane, never a fabricated placeholder photo.
 */
export default function ProductGallery({ media, alt, badge }: { media: MediaLightboxItem[]; alt: string; badge?: string | null }) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const tabVisible = useTabVisible();
  const hasMedia = media.length > 0;
  const activeItem = hasMedia ? media[Math.min(active, media.length - 1)] : null;
  const touchStartX = useRef<number | null>(null);

  // Real images stay mounted (as stacked, opacity-crossfaded layers)
  // once they've been shown once, exactly like HeroSlider's own banner
  // layers -- the previous single-`<ProductMediaImage>`-swapped-by-`key`
  // approach unmounted/remounted on every index change, flashing the
  // loading skeleton on every single auto-advance tick. `visited`
  // starts at just index 0 (never the whole gallery at once -- this
  // project's own established rule against loading every gallery image
  // upfront, see the neighbor-prefetch effect below), and grows only as
  // the shopper (or the auto-advance timer) actually reaches an index.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  if (!visited.has(active)) setVisited(new Set(visited).add(active));

  function go(delta: number) {
    if (!hasMedia) return;
    setActive((i) => (i + delta + media.length) % media.length);
  }

  // Real product-required polish: after `AUTO_ADVANCE_MS`, the primary
  // image animates on to the next one by sort order -- paused while the
  // shopper is actually looking closely (hovering, zoomed in), while a
  // video is the active item (its own `onEnded` handler already
  // advances once it finishes), or while the tab is in the background
  // (never silently burns through the whole gallery unseen).
  useEffect(() => {
    if (media.length < 2 || hoverPaused || zoomOpen || !tabVisible || activeItem?.isVideo) return;
    const timer = setTimeout(() => go(1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is a pure function of `media`/functional setState, never itself a real dependency; every value that actually changes scheduling is already listed.
  }, [active, hoverPaused, zoomOpen, tabVisible, media.length, activeItem?.isVideo]);

  // Real, product-required optimization: as soon as the active image is
  // shown, warm the browser's own cache for its immediate neighbors (the
  // only two items a Prev/Next click can reach next) at the exact same
  // "medium" size the main viewer itself requests -- so clicking next
  // paints from cache almost instantly instead of starting a fresh
  // request. Never prefetches the whole gallery: for a typical 3-5 image
  // set this is at most 2 extra requests, not the "load everything
  // upfront" this project's own performance rules forbid. Video neighbors
  // are skipped -- warming a multi-megabyte video file just because it's
  // adjacent would violate that same rule.
  useEffect(() => {
    if (media.length < 2) return;
    const neighborIndexes = [(active - 1 + media.length) % media.length, (active + 1) % media.length];
    for (const idx of neighborIndexes) {
      const item = media[idx];
      if (item.isVideo) continue;
      const url = resolveImageUrl(deriveProductThumbnail(item.url, "medium") ?? item.url);
      if (!url) continue;
      const img = new window.Image();
      img.src = url;
    }
  }, [active, media]);

  return (
    // Square stage (packshots are square, so the photo fills the card edge to edge) with the thumbnail strip under it.
    <div className="flex flex-col-reverse gap-3">
      {media.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto [justify-content:safe_center] px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {media.map((item, idx) => (
            <button
              key={item.url + idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={t("galleryThumbnail", { n: idx + 1 })}
              aria-current={active === idx}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-white transition-all duration-200 sm:w-[72px] ${
                active === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-bg)]" : "opacity-60 ring-1 ring-border hover:opacity-100 hover:ring-primary/40"
              }`}
            >
              {item.isVideo ? (
                <span className="flex h-full w-full items-center justify-center bg-surface-2">
                  <PlayCircle className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
                </span>
              ) : (
                <ProductMediaImage src={item.url} size="small" alt={`${alt} — ${idx + 1}`} fit="contain" padding="p-1.5" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
              )}
            </button>
          ))}
        </div>
      )}

      <div
        // White stage, like the product cards: packshots are shot on white, so a letterboxed photo reads as one seamless image instead of floating on a dark band.
        className="group/stage relative aspect-square w-full touch-pan-y overflow-hidden rounded-3xl bg-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.55)] ring-1 ring-black/5"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) > 40 && media.length > 1) go(delta > 0 ? -1 : 1);
          touchStartX.current = null;
        }}
      >
        {/* Every visited (non-video) image stays mounted as its own
            crossfaded layer, exactly like HeroSlider's banners -- only
            the opacity changes on an index switch, so a previously-seen
            image never re-flashes its loading skeleton, and auto-
            advance reads as a smooth animated swap, never a flicker. */}
        {media.map((item, idx) => {
          if (item.isVideo || !visited.has(idx)) return null;
          const isActive = idx === active;
          return (
            <div
              key={item.url + idx}
              aria-hidden={!isActive}
              className={`absolute inset-0 overflow-hidden transition-[opacity,transform] duration-500 ease-out group-hover/stage:scale-[1.04] motion-reduce:transition-none ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <ProductMediaImage
                src={item.url}
                size="large"
                alt={alt}
                fit="contain"
                padding=""
                loading={idx === 0 ? "eager" : "lazy"}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 40vw"
                fallbackIcon={<Package className="h-16 w-16 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
                fallbackLabel={tCommon("imageUnavailable")}
              />
            </div>
          );
        })}
        {!hasMedia && (
          // No photo yet: a calm placeholder on the same white stage, not an empty box.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
            <Package className="h-20 w-20" strokeWidth={1} aria-hidden="true" />
            <span className="text-sm font-medium">{tCommon("imageUnavailable")}</span>
          </div>
        )}
        {!activeItem?.isVideo && (
          <button type="button" onClick={() => hasMedia && setZoomOpen(true)} disabled={!hasMedia} aria-label={t("zoomImage")} className={`absolute inset-0 h-full w-full ${hasMedia ? "cursor-zoom-in" : ""}`} />
        )}
        {activeItem?.isVideo && (
          <video
            src={activeItem.url}
            controls
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
            onEnded={() => {
              if (media.length > 1) go(1);
            }}
          />
        )}

        {hasMedia && !activeItem?.isVideo && (
          <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md ring-1 ring-black/5">
            <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        {activeItem?.isVideo && (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label={t("zoomImage")}
            className="nz-glass absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
          >
            <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {badge && (
          <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-3 py-1 text-xs font-extrabold tracking-wide text-white shadow-lg shadow-red-600/30">{badge}</span>
        )}
        {media.length > 1 && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur tabular-nums">
              {active + 1} / {media.length}
            </span>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("previousImage")}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition-all hover:scale-105 sm:opacity-0 sm:group-hover/stage:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("nextImage")}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition-all hover:scale-105 sm:opacity-0 sm:group-hover/stage:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {zoomOpen && hasMedia && <MediaLightbox items={media} alt={alt} initialIndex={active} onClose={() => setZoomOpen(false)} onIndexChange={setActive} />}
    </div>
  );
}
