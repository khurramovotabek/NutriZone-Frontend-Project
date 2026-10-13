"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Banner } from "@/lib/api";
import MediaImage from "@/components/MediaImage";
import { useTabVisible } from "@/hooks/useTabVisible";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Fallback only -- the real duration for each banner comes from its own
 * `duration_seconds` (see `bannerDurationMs`). Used if a banner is ever
 * missing that field (malformed/older API response), never as the
 * primary timing source. */
const DEFAULT_DURATION_MS = 45000;

function bannerDurationMs(banner: Banner | undefined): number {
  const seconds = banner?.duration_seconds;
  return seconds && seconds > 0 ? seconds * 1000 : DEFAULT_DURATION_MS;
}

/** Minimum horizontal drag (px) before a touch gesture counts as a
 * swipe rather than an attempt to scroll the page vertically. */
const SWIPE_THRESHOLD_PX = 40;

type SegmentState = "completed" | "active" | "upcoming";

/**
 * One top-progress segment per banner (Instagram-Stories-style).
 * `active`'s fill is a real CSS animation (`nz-banner-progress-fill`,
 * see globals.css) driven entirely by the browser's compositor -- no
 * JS interval repaints it. Pausing is `animationPlayState: "paused"`,
 * which freezes and later resumes the fill from its exact visual
 * position for free (no elapsed-time bookkeeping needed here).
 *
 * `onFillComplete` fires from `onAnimationEnd` on that same animation
 * -- the single authoritative signal HeroSlider uses to advance to the
 * next banner, so the visual fill and the slide transition can never
 * drift apart the way a separately-timed `setTimeout` would.
 */
function BannerProgressSegment({
  index,
  state,
  playing,
  reducedMotion,
  durationMs,
  label,
  onSelect,
  onFillComplete,
}: {
  index: number;
  state: SegmentState;
  playing: boolean;
  reducedMotion: boolean;
  durationMs: number;
  label: string;
  onSelect: (index: number) => void;
  onFillComplete: () => void;
}) {
  const isActive = state === "active";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={label}
      onClick={() => onSelect(index)}
      className="group h-1 flex-1 overflow-hidden rounded-full bg-white/25 backdrop-blur-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
    >
      <span
        aria-hidden="true"
        onAnimationEnd={(e) => {
          if (e.animationName === "nz-banner-progress-fill") onFillComplete();
        }}
        className={`block h-full rounded-full bg-primary ${
          state === "completed"
            ? "w-full"
            : state === "upcoming"
              ? "w-0"
              : reducedMotion
                ? "w-full ring-1 ring-inset ring-white/70"
                : "nz-banner-progress-fill w-full"
        }`}
        style={isActive && !reducedMotion ? ({ animationDuration: `${durationMs}ms`, animationPlayState: playing ? "running" : "paused" } as CSSProperties) : undefined}
      />
    </button>
  );
}

/**
 * Real, backend-driven hero slider -- Banner is a genuinely new
 * backend model built this phase (confirmed missing entirely before:
 * no Banner/HeroSlide/Promotion model existed anywhere in the
 * project). Renders nothing if there are no active banners, rather
 * than a fabricated placeholder slide.
 *
 * Autoplay/progress timing has exactly one authoritative source per
 * motion preference:
 *  - Normal motion: the CSS fill animation itself (`animationend`
 *    advances the slide -- see BannerProgressSegment).
 *  - `prefers-reduced-motion: reduce`: a single pause-aware
 *    `setTimeout` (never `setInterval`), since a static progress
 *    segment has no animation event to listen for. Hover/tab-hidden
 *    pausing is implemented by recording remaining time on cleanup and
 *    rescheduling from there on resume -- never restarts from zero.
 */
export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const t = useTranslations("home.banner");
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  // Tab visibility: pause exactly like a hover-pause so a background
  // tab never silently burns through several slides at once, and
  // resumes accurately (not from zero) when the user returns.
  const tabVisible = useTabVisible();
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION_QUERY).matches, () => false);
  const remainingMsRef = useRef(bannerDurationMs(banners[0]));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasMultiple = banners.length > 1;
  const playing = hasMultiple && !hoverPaused && tabVisible;

  const goTo = useCallback(
    (next: number) => {
      if (banners.length === 0) return;
      setIndex((next + banners.length) % banners.length);
    },
    [banners.length],
  );

  // Manual navigation (arrows/indicators/swipe) always resets progress
  // for the newly-selected slide -- true for auto-advance too, since
  // both paths funnel through this same `goTo`/`index` state. Duration
  // is that banner's own `duration_seconds`, never the fixed fallback.
  useEffect(() => {
    remainingMsRef.current = bannerDurationMs(banners[index]);
  }, [index, banners]);

  // Reduced-motion fallback timer -- the only place in this component
  // that uses setTimeout, and only ever one at a time. Cleanup banks
  // whatever time was left so a pause/resume cycle resumes exactly
  // where it left off instead of restarting the full duration.
  useEffect(() => {
    if (!reducedMotion || !playing) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => goTo(index + 1), remainingMsRef.current);
    return () => {
      clearTimeout(timer);
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - startedAt));
    };
  }, [reducedMotion, playing, index, goTo]);

  function onTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !hasMultiple) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Ignore small movements and mostly-vertical drags -- those are page scrolling, not a slide swipe (no preventDefault anywhere here, so real scrolling is never blocked).
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  }

  if (banners.length === 0) return null;

  const banner = banners[index];

  return (
    <div
      className="nz-glass relative h-[300px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#101418] to-[#080B0D] sm:h-[380px] lg:h-[420px]"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("region")}
    >
      {/* Every banner's image layer is mounted once and stays mounted --
          keyed by the banner's own stable id, never by `index`. A
          previous version keyed this on `index`, which unmounted and
          remounted a brand-new `MediaImage` on every slide change,
          resetting it to its own "loading" state and flashing its gray
          skeleton for a frame (plus the outer 0%-opacity start of its
          fade-in) on every single transition -- the reported white/
          black/gray flicker between banners. Crossfading opacity on a
          layer that's already loaded and stays mounted has nothing to
          reset, so the image itself never disappears or flashes; only
          the top progress indicator animates continuously. */}
      {banners.map((b, i) => {
        const isActive = i === index;
        // Nearest neighbors get an eager, high-priority fetch so the
        // very next/previous slide is already decoded by the time it
        // becomes active (see spec: preload next, don't eagerly load
        // the whole collection at max priority).
        const isNeighbor = Math.abs(i - index) <= 1 || Math.abs(i - index) >= banners.length - 1;
        return (
          <div
            key={b.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <MediaImage
              src={b.image_url}
              alt=""
              fit="cover"
              loading={isNeighbor ? "eager" : "lazy"}
              sizes="100vw"
              fallbackIcon={<ImageOff className="h-10 w-10 text-white/30" strokeWidth={1.25} aria-hidden="true" />}
            />
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {hasMultiple && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-3 sm:pt-4">
          <div role="tablist" aria-label={t("region")} className="pointer-events-auto flex w-full max-w-[min(90%,26rem)] gap-1.5">
            {banners.map((b, i) => (
              <BannerProgressSegment
                key={b.id}
                index={i}
                state={i < index ? "completed" : i === index ? "active" : "upcoming"}
                playing={playing}
                reducedMotion={reducedMotion}
                durationMs={bannerDurationMs(b)}
                label={t("goTo", { number: i + 1 })}
                onSelect={goTo}
                onFillComplete={() => {
                  if (i === index) goTo(index + 1);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {t("status", { current: index + 1, total: banners.length })}
      </p>

      <div key={`content-${index}`} className="animate-nz-banner-fade-in relative flex h-full flex-col justify-end p-6 sm:p-10 lg:p-14">
        <h2 className="max-w-xl text-2xl font-bold leading-tight text-white sm:text-4xl">{banner.title}</h2>
        {banner.subtitle && <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">{banner.subtitle}</p>}
        {banner.cta_text && banner.cta_url && (
          // a "go to Telegram" call-to-action is pointless inside the Telegram Mini App -- hidden there (html[data-tg])
          <Link href={banner.cta_url} className={`nz-cta nz-shimmer-btn mt-5 inline-flex w-fit items-center rounded-xl px-6 py-3 text-sm font-bold${/^https?:\/\/(t\.me|telegram\.me)\//.test(banner.cta_url) ? " nz-tg-hide" : ""}`}>
            {banner.cta_text}
          </Link>
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t("previous")}
            className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 sm:flex items-center justify-center rounded-full border border-white/10 bg-black/40 text-white outline-none backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t("next")}
            className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 sm:flex items-center justify-center rounded-full border border-white/10 bg-black/40 text-white outline-none backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}
