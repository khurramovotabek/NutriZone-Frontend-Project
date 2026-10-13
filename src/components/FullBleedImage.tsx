"use client";

import type { ReactNode } from "react";
import MediaImage from "@/components/MediaImage";

/**
 * Fills its frame edge-to-edge (no padding, no empty bands) while never
 * cropping the image itself: the image is shown whole ("contain") over a
 * blurred, enlarged copy of the same image that covers the rest of the
 * frame. Made for card images whose aspect ratio is not controlled --
 * brand logos, blog covers, category photos -- where plain "cover" cuts
 * off logo text or the product in a portrait photo, and plain "contain"
 * leaves empty bars. A landscape image that already matches the frame
 * simply fills it.
 *
 * The backdrop uses the same URL and `sizes` as the foreground, so it is
 * a browser-cache hit, not a second download. Must be placed inside a
 * `relative overflow-hidden` container that sets the frame's size.
 */
export default function FullBleedImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  className = "",
  fallbackIcon,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  loading?: "lazy" | "eager";
  /** Extra classes for the foreground image (hover zoom, etc.). */
  className?: string;
  fallbackIcon: ReactNode;
}) {
  return (
    <>
      {src && (
        // -inset pushes the blur's soft, semi-transparent edge outside the frame (clipped by the parent), so no dark halo shows at the card's edges.
        <div aria-hidden="true" className="absolute -inset-10 blur-2xl saturate-150">
          <MediaImage src={src} alt="" fit="cover" loading={loading} sizes={sizes} fallbackIcon={null} />
        </div>
      )}
      <MediaImage src={src} alt={alt} fit="contain" loading={loading} sizes={sizes} className={className} fallbackIcon={fallbackIcon} />
    </>
  );
}
