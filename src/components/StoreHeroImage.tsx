"use client";

import { useState } from "react";
import { Store as StoreIcon } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import { deriveLargeVariant } from "@/lib/media";

/**
 * The store hero's cover image, specifically -- the one place on this
 * page that needs the largest resolution the backend's own media
 * pipeline already generated but never links to directly (see
 * lib/media.ts::deriveLargeVariant's own docstring for the confirmed
 * root cause of the "blurry hero" complaint: `cover_image_url` is
 * always the same "medium" thumbnail used for small list cards).
 *
 * Tries the derived `large` sibling first; if that specific asset
 * doesn't actually exist (a store whose media predates the 3-size
 * pipeline), falls back to the exact URL the API gave us -- never a
 * broken image, never CSS blur pretending to hide low resolution.
 */
export default function StoreHeroImage({ src, alt }: { src: string | null; alt: string }) {
  const derivedLarge = deriveLargeVariant(src);
  const [useLarge, setUseLarge] = useState(Boolean(derivedLarge));
  const effectiveSrc = useLarge && derivedLarge ? derivedLarge : src;

  return (
    <div className="absolute inset-0 bg-surface-2">
      <MediaImage
        key={effectiveSrc}
        src={effectiveSrc}
        alt={alt}
        fit="cover"
        loading="eager"
        sizes="100vw"
        onLoadError={() => {
          if (useLarge) setUseLarge(false);
        }}
        fallbackIcon={<StoreIcon className="h-12 w-12 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
      />
    </div>
  );
}
