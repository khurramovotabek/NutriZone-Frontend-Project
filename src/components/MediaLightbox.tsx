"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Package, PlayCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import MediaImage from "@/components/MediaImage";

export interface MediaLightboxItem {
  url: string;
  isVideo: boolean;
}

/**
 * Portaled fullscreen viewer for a mixed image/video gallery -- shared
 * by the store gallery and (via `ProductGallery`) the product detail
 * gallery's own real, existing `variant.video_url`, which previously
 * had nowhere to render at all. One implementation instead of two
 * near-identical ones (the pre-existing image-only `ImageLightbox`
 * stays as-is -- `ReviewEditModal`'s photo zoom has no video concept
 * at all, so it keeps the simpler, image-only component).
 */
export default function MediaLightbox({
  items,
  alt,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  items: MediaLightboxItem[];
  alt: string;
  initialIndex: number;
  onClose: () => void;
  /** Lets the underlying gallery's thumbnail rail stay in sync with whatever the visitor lands on inside the lightbox. */
  onIndexChange?: (index: number) => void;
}) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const [index, setIndex] = useState(initialIndex);
  const mounted = useIsClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = (i + delta + items.length) % items.length;
        onIndexChange?.(next);
        return next;
      });
    },
    [items.length, onIndexChange],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && items.length > 1) go(-1);
      else if (e.key === "ArrowRight" && items.length > 1) go(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [go, items.length, onClose]);

  if (!mounted) return null;

  const active = items[index];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("zoomImage")}
      className="animate-nz-fade-in fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 40 && items.length > 1) go(delta > 0 ? -1 : 1);
        touchStartX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {items.length > 1 ? (
          <span className="text-sm font-medium text-white/70">
            {index + 1} / {items.length}
          </span>
        ) : (
          <span />
        )}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={tCommon("close")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4 sm:px-10 sm:pb-10">
        <div className="relative flex h-full w-full items-center justify-center">
          {active.isVideo ? (
            <video src={active.url} controls autoPlay preload="metadata" className="max-h-full max-w-full rounded-lg" />
          ) : (
            <MediaImage src={active.url} alt={alt} fit="contain" fallbackIcon={<Package className="h-16 w-16 text-white/40" strokeWidth={1.25} aria-hidden="true" />} />
          )}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("previousImage")}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("nextImage")}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-4 sm:pb-6">
          {items.map((item, idx) => (
            <button
              key={item.url + idx}
              type="button"
              onClick={() => {
                setIndex(idx);
                onIndexChange?.(idx);
              }}
              aria-label={t("galleryThumbnail", { n: idx + 1 })}
              aria-current={index === idx}
              className={`relative aspect-square w-14 shrink-0 overflow-hidden rounded-lg bg-white/10 transition-all ${
                index === idx ? "ring-2 ring-white" : "opacity-50 hover:opacity-80"
              }`}
            >
              {item.isVideo ? (
                <span className="flex h-full w-full items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-white/70" strokeWidth={1.5} aria-hidden="true" />
                </span>
              ) : (
                <MediaImage src={item.url} alt="" fit="cover" fallbackIcon={<Package className="h-4 w-4 text-white/40" strokeWidth={1.25} aria-hidden="true" />} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
