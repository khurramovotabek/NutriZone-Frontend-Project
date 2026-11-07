"use client";

import { useState, type ReactNode } from "react";

/**
 * A profile photo that falls back to `fallback` (usually a person icon) when there is no URL or the image fails to
 * load -- never the browser's broken-image glyph. Remembers which URL failed, so a newly uploaded photo is tried again.
 */
export default function AvatarImage({ src, className = "h-full w-full object-cover", fallback }: { src: string | null | undefined; className?: string; fallback: ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element -- backend media domain isn't configured in next.config.ts's images.remotePatterns.
  return <img src={src} alt="" className={className} onError={() => setFailedSrc(src)} />;
}
