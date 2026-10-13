"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import type { Message } from "@/lib/account-api";
import { resolveImageUrl } from "@/lib/media";

/**
 * Renders one message's real attachment (`Message.attachment_url` /
 * `attachment_type`, both now returned by the read-shape fix this
 * phase closed). A sticker is not a separate backend type -- it's an
 * `attachment_type=image` message whose URL points at this frontend's
 * own fixed `/stickers/*.svg` set (see `RealMediaStorageGateway.
 * STICKER_SLUGS` for the matching backend allow-list) -- detected here
 * purely by URL shape, and rendered borderless/larger, Telegram-style,
 * rather than inside a chat-bubble image frame.
 */
export default function AttachmentBubble({ message }: { message: Message }) {
  const [videoError, setVideoError] = useState(false);
  if (!message.attachment_url || !message.attachment_type) return null;

  const isSticker = /\/stickers\/[a-z-]+\.svg$/.test(message.attachment_url);

  if (isSticker) {
    return (
      <div className="p-1">
        {/* Same-origin frontend asset (not backend-hosted) -- never run through resolveImageUrl, which would incorrectly re-host it onto the backend origin. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, tiny original SVG set, not a Next/Image-optimizable remote photo. */}
        <img src={message.attachment_url} alt="" className="h-24 w-24" draggable={false} />
      </div>
    );
  }

  // Real, recurring bug this closes: `attachment_url` is whatever
  // absolute URL the backend returned at upload time -- see
  // resolveImageUrl's own docstring for why that specific host can
  // later go dead (a rotated dev tunnel, a migrated production domain)
  // while the exact same file is still served fine by today's backend.
  // Every other real image on this site already goes through this same
  // resolver; a chat attachment is no different.
  const resolvedUrl = resolveImageUrl(message.attachment_url);

  if (message.attachment_type === "video") {
    return (
      <div className="overflow-hidden rounded-lg">
        {videoError || !resolvedUrl ? (
          <div className="flex h-40 w-56 items-center justify-center bg-surface-2 text-ink-soft">
            <PlayCircle className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </div>
        ) : (
          <video src={resolvedUrl} controls preload="metadata" className="max-h-72 max-w-full rounded-lg" onError={() => setVideoError(true)} />
        )}
      </div>
    );
  }

  if (!resolvedUrl) return null;

  return (
    <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote, backend-hosted upload; not part of the Next/Image static asset domain allow-list. */}
      <img src={resolvedUrl} alt={message.attachment_filename ?? ""} className="max-h-72 max-w-full rounded-lg object-cover" />
    </a>
  );
}
