"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package, Pause, Play, Volume2, VolumeX, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import MediaLightbox, { type MediaLightboxItem } from "@/components/MediaLightbox";
import ProductMediaImage from "@/components/ProductMediaImage";
import { useTabVisible } from "@/hooks/useTabVisible";

/** How long the main image stays up before auto-advancing to the next one, sort order 1 -> 2 -> 3 ... -> back to 1. Long enough to actually look at a product photo, short enough that a shopper who never touches the gallery still sees every real photo within a normal page visit. */
const AUTO_ADVANCE_MS = 4500;

/** Slide animation: a soft "ease-out-expo"-like curve, long enough to read as a premium glide, short enough not to feel slow. */
const SLIDE_EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";
const SLIDE_MS = 560;
/** Horizontal finger travel (px) that counts as a swipe instead of a tap. */
const SWIPE_PX = 40;

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
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const tabVisible = useTabVisible();
  const hasMedia = media.length > 0;
  const count = media.length;
  const current = hasMedia ? Math.min(active, count - 1) : 0;
  const activeItem = hasMedia ? media[current] : null;
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  // Slides are a real horizontal track. A slide's image mounts the first
  // time it is the active slide or a direct neighbour (so the photo is
  // already there while it glides in) and then stays mounted -- never the
  // whole gallery up front.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1]));
  const wanted = [current, (current + 1) % Math.max(count, 1), (current - 1 + count) % Math.max(count, 1)];
  if (wanted.some((i) => !mounted.has(i))) setMounted(new Set([...mounted, ...wanted]));

  function go(delta: number) {
    if (!hasMedia) return;
    setActive((i) => (i + delta + count) % count);
  }

  // After `AUTO_ADVANCE_MS` the next photo slides in -- paused while the
  // shopper hovers, drags, has the zoom open, while a video is playing
  // (it advances itself when it ends) or while the tab is hidden.
  useEffect(() => {
    if (count < 2 || hoverPaused || dragging || zoomOpen || !tabVisible || activeItem?.isVideo) return;
    const timer = setTimeout(() => go(1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is a pure function of `media`/functional setState, never itself a real dependency; every value that actually changes scheduling is already listed.
  }, [active, hoverPaused, dragging, zoomOpen, tabVisible, count, activeItem?.isVideo]);

  function onTouchStart(e: React.TouchEvent) {
    const p = e.touches[0];
    if (!p || count < 2) return;
    touch.current = { x: p.clientX, y: p.clientY, axis: null };
  }

  function onTouchMove(e: React.TouchEvent) {
    const start = touch.current;
    const p = e.touches[0];
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (start.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) > 6) start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (start.axis !== "x") return;
    setDragging(true);
    // Rubber-band at the two ends so the track never shows an empty gap.
    const atEdge = (current === 0 && dx > 0) || (current === count - 1 && dx < 0);
    setDragX(atEdge ? dx * 0.35 : dx);
  }

  function onTouchEnd() {
    const start = touch.current;
    touch.current = null;
    if (!start || start.axis !== "x") return;
    const width = stageRef.current?.clientWidth ?? 1;
    const dx = dragX;
    setDragging(false);
    setDragX(0);
    if (Math.abs(dx) > Math.min(SWIPE_PX, width * 0.12)) {
      suppressClick.current = true;
      if (dx < 0 && current < count - 1) setActive(current + 1);
      else if (dx > 0 && current > 0) setActive(current - 1);
    }
  }

  return (
    // Square stage (packshots are square, so the photo fills the card edge to edge) with the thumbnail strip under it.
    <div className="flex flex-col-reverse gap-3">
      {count > 1 && (
        <div className="flex gap-2.5 overflow-x-auto [justify-content:safe_center] px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {media.map((item, idx) => (
            <button
              key={item.url + idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={item.isVideo ? t("videoThumbnail") : t("galleryThumbnail", { n: idx + 1 })}
              aria-current={current === idx}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-white transition-all duration-200 sm:w-[72px] ${
                current === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-bg)]" : "opacity-60 ring-1 ring-border hover:opacity-100 hover:ring-primary/40"
              }`}
            >
              {item.isVideo ? (
                // The video's own first frame (metadata only, no full download) under a play badge -- a real preview, not a generic icon.
                <span className="relative block h-full w-full bg-slate-900">
                  <video src={`${item.url}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="pointer-events-none h-full w-full object-cover opacity-90" />
                  <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/10 to-transparent">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-md">
                      <Play className="ml-px h-3 w-3 fill-slate-900 text-slate-900" strokeWidth={2} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-white drop-shadow">{t("videoLabel")}</span>
                </span>
              ) : (
                <ProductMediaImage src={item.url} size="small" alt={`${alt} — ${idx + 1}`} fit="contain" padding="p-1.5" fallbackIcon={<Package className="h-4 w-4 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
              )}
            </button>
          ))}
        </div>
      )}

      <div
        ref={stageRef}
        // White stage, like the product cards: packshots are shot on white, so a letterboxed photo reads as one seamless image instead of floating on a dark band.
        className="group/stage relative aspect-square w-full touch-pan-y select-none overflow-hidden rounded-3xl bg-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.55)] ring-1 ring-black/5"
        role="region"
        aria-roledescription="carousel"
        aria-label={alt}
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
        }}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* The slide track: every slide is a full-width panel side by side; moving `active` glides the whole track, a finger drag moves it live. */}
        <div
          className="flex h-full w-full will-change-transform motion-reduce:!transition-none"
          style={{
            transform: `translate3d(calc(${-current * 100}% + ${dragX}px), 0, 0)`,
            transition: dragging ? "none" : `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
          }}
        >
          {media.map((item, idx) => {
            const isActive = idx === current;
            return (
              <div
                key={item.url + idx}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} / ${count}`}
                aria-hidden={!isActive}
                className="relative h-full w-full shrink-0 overflow-hidden"
              >
                {item.isVideo ? (
                  isActive ? (
                    <ProductVideoStage
                      url={item.url}
                      onEnded={() => {
                        if (count > 1) go(1);
                      }}
                    />
                  ) : (
                    // Off-screen video slide: just its first frame on the dark backdrop, so the glide in/out looks continuous.
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_90%_at_50%_10%,#334155_0%,#0f172a_55%,#020617_100%)] p-4 sm:p-6">
                      {mounted.has(idx) && <video src={`${item.url}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="max-h-full max-w-full rounded-2xl object-contain opacity-80" />}
                    </div>
                  )
                ) : (
                  mounted.has(idx) && (
                    <div className={`absolute inset-0 transition-transform duration-700 ease-out motion-reduce:transition-none ${isActive ? "group-hover/stage:scale-[1.04]" : ""}`}>
                      <ProductMediaImage
                        src={item.url}
                        size="large"
                        alt={isActive ? alt : `${alt} — ${idx + 1}`}
                        fit="contain"
                        padding=""
                        loading={idx === 0 ? "eager" : "lazy"}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 40vw"
                        fallbackIcon={<Package className="h-16 w-16 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
                        fallbackLabel={tCommon("imageUnavailable")}
                      />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {!hasMedia && (
          // No photo yet: a calm placeholder on the same white stage, not an empty box.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
            <Package className="h-20 w-20" strokeWidth={1} aria-hidden="true" />
            <span className="text-sm font-medium">{tCommon("imageUnavailable")}</span>
          </div>
        )}
        {hasMedia && !activeItem?.isVideo && (
          <button
            type="button"
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              setZoomOpen(true);
            }}
            aria-label={t("zoomImage")}
            className="absolute inset-0 h-full w-full cursor-zoom-in"
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
            className={`absolute right-3 ${badge ? "top-12" : "top-3"} z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-transform hover:scale-105`}
          >
            <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {badge && (
          <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-3 py-1 text-xs font-extrabold tracking-wide text-white shadow-lg shadow-red-600/30">{badge}</span>
        )}
        {count > 1 && (
          <>
            {!activeItem?.isVideo && (
              <>
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur tabular-nums">
                  {current + 1} / {count}
                </span>
                {/* Slide indicator: the active pill stretches, the rest are dots. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden="true">
                  {media.map((item, idx) => (
                    <span
                      key={item.url + idx}
                      className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? "w-6 bg-slate-900/80" : "w-1.5 bg-slate-900/20"}`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("previousImage")}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition-all hover:scale-105 sm:opacity-0 sm:group-hover/stage:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("nextImage")}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition-all hover:scale-105 sm:opacity-0 sm:group-hover/stage:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {zoomOpen && hasMedia && <MediaLightbox items={media} alt={alt} initialIndex={current} onClose={() => setZoomOpen(false)} onIndexChange={setActive} />}
    </div>
  );
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The product video on the gallery stage. Phone clips are vertical
 * (9:16), so instead of a thin strip on a white square the clip sits as
 * a rounded "reel" card on a dark studio backdrop with a soft glow. It
 * starts muted (browsers only allow muted autoplay) the moment the
 * shopper reaches it, and has its own minimal controls: tap to
 * play/pause, a sound toggle, elapsed/total time and a thin progress
 * line. When it finishes the gallery moves on to the next photo.
 */
function ProductVideoStage({ url, onEnded }: { url: string; onEnded: () => void }) {
  const t = useTranslations("product");
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  }

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) video.play().catch(() => undefined);
  }

  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_10%,#334155_0%,#0f172a_55%,#020617_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />
      <button type="button" onClick={toggle} aria-label={playing ? t("videoPause") : t("videoPlay")} className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <video
          ref={ref}
          src={url}
          muted
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            onEnded();
          }}
          className="relative max-h-full max-w-full rounded-2xl object-contain shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10"
        />
        {!playing && (
          <span className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-2xl ring-8 ring-white/15 transition-transform">
            <Play className="ml-1 h-7 w-7 fill-slate-900 text-slate-900" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
      </button>

      <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur-md">
        <span className={`h-1.5 w-1.5 rounded-full ${playing ? "animate-pulse bg-rose-400" : "bg-white/70"}`} aria-hidden="true" />
        {t("videoLabel")}
      </span>

      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2.5 rounded-full bg-black/45 px-2 py-1.5 text-white ring-1 ring-white/10 backdrop-blur-md">
        <button type="button" onClick={toggle} aria-label={playing ? t("videoPause") : t("videoPlay")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
          {playing ? <Pause className="h-3.5 w-3.5 fill-white" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-px h-3.5 w-3.5 fill-white" strokeWidth={2} aria-hidden="true" />}
        </button>
        <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/90">
          {formatClock(time)} / {formatClock(duration)}
        </span>
        <button type="button" onClick={toggleSound} aria-label={muted ? t("videoUnmute") : t("videoMute")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
          {muted ? <VolumeX className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
