"use client";

import { useState } from "react";
import { User } from "lucide-react";

interface Props {
  avatarUrl: string | null;
  alt: string;
  size?: number;
  className?: string;
}

/**
 * Real, product-required capability: shows the user's actual profile
 * photo (circular, object-fit: cover) wherever a generic profile icon
 * previously stood in. Robust fallback chain: no avatar_url -> generic
 * icon; avatar_url present but fails to load (broken link, deleted
 * media) -> falls back to the same generic icon rather than exposing
 * a broken-image UI. Never a second, divergent avatar source --
 * avatar_url comes from the same backend field the /profile page's
 * own upload flow already writes to.
 */
export default function UserAvatar({ avatarUrl, alt, size = 32, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <span className={`nz-glass inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`} style={{ width: size, height: size }}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny avatar whose URL may be on any host (e.g. a Telegram photo), outside next/image's remotePatterns.
        <img src={avatarUrl} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <User className="text-ink-soft" style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={1.75} aria-hidden="true" />
      )}
    </span>
  );
}
