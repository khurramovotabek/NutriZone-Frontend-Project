"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cacheConversationStore, type CachedStoreSummary } from "@/lib/chat-store-cache";

/**
 * The concrete "choose who you're messaging" entry point: opens (or
 * resumes) a real conversation with this store's owner via
 * `POST /api/chat/conversations/store/{storeId}`, then hands off to
 * `/account/chat` -- the exact same inbox "Support Chat" already lives
 * in, just seated with a different, real participant. Also the entry
 * point the customer-picks-a-store selector on `/account/chat` itself
 * uses under the hood -- same endpoint, same cache, one code path for
 * "message this store" everywhere it appears.
 */
export default function MessageStoreButton({ store, className }: { store: CachedStoreSummary; className?: string }) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    if (opening) return;
    setOpening(true);
    setError(false);
    try {
      const res = await fetch(`/api/chat/conversations/store/${store.id}`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(true);
        return;
      }
      cacheConversationStore(body.data.id, store);
      router.push(`/account/chat?conversation=${body.data.id}`);
    } catch {
      setError(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={opening}
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {opening ? t("messaging") : t("messageStore")}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-300">
          {t("messageStoreError")}
        </p>
      )}
    </div>
  );
}
