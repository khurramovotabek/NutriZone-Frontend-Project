"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { resolveImageUrl } from "@/lib/media";

/** Reasonable default for a grid-of-cards context (product/brand/blog cards) -- callers whose real rendered width is meaningfully different (a full-bleed hero, a small fixed thumbnail) should pass their own `sizes`, since that's what actually lets the browser fetch the right-sized variant instead of always the largest one. */
const DEFAULT_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

interface MediaImageProps {
  /** Raw URL straight from a backend field (primary_image_path, cover_image_url, logo_url, image_url, ...). */
  src: string | null | undefined;
  alt: string;
  /** "cover" fills and crops (store cover photos); "contain" shows the whole image un-cropped (product packaging, logos). */
  fit?: "cover" | "contain";
  /** Icon shown in place of a missing/failed image -- never a stock photo. */
  fallbackIcon: ReactNode;
  /** Optional short label under the fallback icon (e.g. t("common.imageUnavailable")). Omit for small thumbnails where there's no room. */
  fallbackLabel?: string;
  /** Tailwind padding class applied to the image itself -- lets "contain" images breathe inside their container without the caller repeating the same p-* on every callsite. */
  padding?: string;
  loading?: "lazy" | "eager";
  /** Extra classes merged onto the image (hover/scale transitions, etc). */
  className?: string;
  /** How wide this image actually renders at each breakpoint -- see `DEFAULT_SIZES`. */
  sizes?: string;
  /**
   * Optional: fires in addition to (never instead of) this component's
   * own fallback-icon handling, only when `src` itself fails to load.
   * Exists for the one real case that needs it -- a caller that swapped
   * in a derived higher-resolution URL (see lib/media.ts::deriveLargeVariant)
   * and needs to know to fall back to the original URL it already had.
   * Every other existing call site simply never passes this.
   */
  onLoadError?: () => void;
}

/**
 * The one rendering path for every real product/store image in the
 * storefront -- resolves the URL once (`resolveImageUrl`) and owns
 * load/error state so every caller gets identical skeleton -> image,
 * or skeleton -> neutral fallback, behavior instead of each page
 * re-implementing its own ad hoc <img>/conditional-icon block.
 *
 * Real `next/image`, not a plain `<img>` -- the previous version
 * avoided it because the backend media host (`NEXT_PUBLIC_API_BASE_URL`)
 * is a per-environment value (including a rotating Cloudflare Quick
 * Tunnel subdomain in local dev) that can't be statically declared in
 * next.config.ts's `images.remotePatterns`. That's now solved instead
 * of worked around: next.config.ts derives the pattern from that same
 * env var at config-load time (plus a `*.trycloudflare.com` wildcard
 * for a tunnel that rotates after the dev server has already booted),
 * so every real product/store/blog/banner image on the site now gets
 * `next/image`'s actual optimization -- responsive `srcset`, modern-
 * format negotiation, real lazy-loading, `priority` preloading for
 * above-the-fold images -- instead of the browser always fetching one
 * full-resolution file regardless of how small it's actually displayed.
 *
 * This component only fills its parent (`fill`, sized via the
 * caller's own wrapping `relative overflow-hidden` container) -- keeps
 * one shared component correct for a 1:1 product card, a wide store
 * cover photo, and a square logo alike, with zero layout shift: the
 * container's size never depends on whether the image has loaded yet.
 */
export default function MediaImage({ src, alt, fit = "contain", fallbackIcon, fallbackLabel, padding = "", loading = "lazy", className = "", sizes = DEFAULT_SIZES, onLoadError }: MediaImageProps) {
  const resolved = resolveImageUrl(src);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(resolved ? "loading" : "error");

  // Re-evaluate when the resolved URL itself changes (e.g. a gallery
  // swap or a client-side upload replacing the src) -- never keeps
  // showing a stale error/loaded state for a brand-new URL.
  const [statusFor, setStatusFor] = useState(resolved);
  if (statusFor !== resolved) {
    setStatusFor(resolved);
    setStatus(resolved ? "loading" : "error");
  }

  const isPriority = loading === "eager";

  return (
    <>
      {resolved && status !== "error" && (
        <Image
          src={resolved}
          alt={alt}
          fill
          sizes={sizes}
          quality={90}
          priority={isPriority}
          loading={isPriority ? undefined : "lazy"}
          unoptimized={resolved.startsWith("data:")}
          onLoad={() => setStatus("loaded")}
          onError={() => {
            setStatus("error");
            onLoadError?.();
          }}
          className={`${fit === "cover" ? "object-cover" : "object-contain"} ${padding} transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"} ${className}`}
        />
      )}
      {status === "loading" && resolved && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-2" />}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-soft">
          {fallbackIcon}
          {fallbackLabel && <span className="px-2 text-center text-[11px] font-medium leading-tight">{fallbackLabel}</span>}
        </div>
      )}
    </>
  );
}
