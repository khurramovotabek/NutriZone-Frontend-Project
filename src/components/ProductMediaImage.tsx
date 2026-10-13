"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import MediaImage from "@/components/MediaImage";
import { deriveProductThumbnail } from "@/lib/media";

/**
 * Drop-in `MediaImage` replacement for every real product image on the
 * site -- requests the appropriately-sized real WebP thumbnail
 * (small/medium/large) instead of the full-resolution original
 * `primary_image_path`/`gallery[]` URL the API always returns (see
 * `deriveProductThumbnail`'s own docstring for the confirmed root
 * cause). Falls back to the exact original URL on a load error (a
 * media row that predates/bypassed the thumbnail pipeline), never a
 * broken image.
 */
export default function ProductMediaImage({
  src,
  size,
  alt,
  fit = "contain",
  padding = "",
  loading = "lazy",
  className = "",
  sizes,
  fallbackIcon,
  fallbackLabel,
}: {
  src: string | null | undefined;
  size: "small" | "medium" | "large";
  alt: string;
  fit?: "cover" | "contain";
  padding?: string;
  loading?: "lazy" | "eager";
  className?: string;
  sizes?: string;
  fallbackIcon: ReactNode;
  fallbackLabel?: string;
}) {
  const derived = deriveProductThumbnail(src, size);
  // The src whose derived thumbnail failed to load. Swapping to a
  // different source image (gallery navigation, variant switch) re-arms
  // the derived URL automatically -- never keeps retrying a previous
  // image's already-known-broken derived URL against the new one.
  const [derivedFailedFor, setDerivedFailedFor] = useState<string | null | undefined>(undefined);
  const useDerived = Boolean(derived) && derivedFailedFor !== src;

  const effectiveSrc = useDerived && derived ? derived : src;

  return (
    <MediaImage
      key={effectiveSrc}
      src={effectiveSrc}
      alt={alt}
      fit={fit}
      padding={padding}
      loading={loading}
      className={className}
      sizes={sizes}
      fallbackIcon={fallbackIcon}
      fallbackLabel={fallbackLabel}
      onLoadError={() => {
        if (useDerived) setDerivedFailedFor(src);
      }}
    />
  );
}
