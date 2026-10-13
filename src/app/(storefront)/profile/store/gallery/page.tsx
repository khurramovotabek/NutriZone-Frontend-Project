"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Store as StoreIcon, Video, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";

export default function StoreGalleryPage() {
  const t = useTranslations("myStore");
  const { store, setStore } = useStoreDashboard();
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  if (!store) return null;

  /** Real, closed gap: the input previously accepted (and this handler
   * only ever read) a single file -- selecting several images at once
   * silently uploaded just the first. The backend endpoint has always
   * supported a store having many media items, one POST per item (see
   * its own docstring); this now actually calls it once per selected
   * file. Sequential, not parallel: each call resolves
   * `next_sort_order` from a fresh `store.media.count()` on the
   * server, so firing them in parallel could race and hand two files
   * the same sort_order. A failure on one file doesn't abort the
   * rest -- every other selected file still gets its own attempt. */
  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !store) return;
    setMediaUploading(true);
    setUploadError(null);
    const uploaded: { id: number; url: string; is_video: boolean }[] = [];
    let failedCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        try {
          const formData = new FormData();
          formData.set("media", files[i]);
          const res = await fetch("/api/my-store/media", { method: "POST", body: formData });
          const body = await res.json();
          if (res.ok && body.success) {
            uploaded.push({ id: body.data.id, url: body.data.url, is_video: body.data.is_video });
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
      if (uploaded.length > 0) {
        setStore({
          ...store,
          media: [...store.media, ...uploaded.map((item, i) => ({ ...item, sort_order: store.media.length + i }))],
        });
      }
      if (failedCount > 0) setUploadError(failedCount === files.length ? t("uploadError") : t("uploadErrorPartial", { count: failedCount }));
    } finally {
      setMediaUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  async function handleRemoveMedia(mediaId: number | undefined) {
    if (!mediaId || !store) return;
    const res = await fetch(`/api/my-store/media/${mediaId}`, { method: "DELETE" });
    if (res.status === 204) {
      setStore({ ...store, media: store.media.filter((m) => m.id !== mediaId) });
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{t("gallery")}</h2>
        <Button type="button" variant="secondary" onClick={() => mediaInputRef.current?.click()} disabled={mediaUploading}>
          {mediaUploading ? (uploadProgress ? t("uploadingMultiple", uploadProgress) : t("uploading")) : t("addMedia")}
        </Button>
        <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaChange} />
      </div>
      {uploadError && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
      {store.media.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("noMediaYet")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {store.media.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              {item.is_video ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Video className="h-6 w-6 text-ink-soft" strokeWidth={1.5} />
                </div>
              ) : (
                <MediaImage src={item.url} alt="" fit="cover" fallbackIcon={<StoreIcon className="h-6 w-6 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
              )}
              <button
                type="button"
                onClick={() => handleRemoveMedia(item.id)}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-opacity focus-visible:opacity-100 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={t("removeProduct")}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
