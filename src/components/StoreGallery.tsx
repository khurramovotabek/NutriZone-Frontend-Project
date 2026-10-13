"use client";

import { useState } from "react";
import { PlayCircle, Store as StoreIcon } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import MediaLightbox, { type MediaLightboxItem } from "@/components/MediaLightbox";

export default function StoreGallery({ items, storeName }: { items: MediaLightboxItem[]; storeName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {items.map((item, idx) => (
          <button
            key={item.url + idx}
            type="button"
            onClick={() => setOpenIndex(idx)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2 transition-transform hover:-translate-y-0.5"
          >
            {item.isVideo ? (
              <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" />
            ) : (
              <MediaImage src={item.url} alt={`${storeName} ${idx + 1}`} fit="cover" fallbackIcon={<StoreIcon className="h-6 w-6 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
            )}
            {item.isVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:bg-black/30">
                <PlayCircle className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden="true" />
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && <MediaLightbox items={items} alt={storeName} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
    </>
  );
}
