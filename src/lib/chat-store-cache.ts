/**
 * Real, honest limitation this file works around (see `ConversationThread`'s
 * previous `cachedStoreName` and `MessageStoreButton`'s own docstring):
 * `Conversation`/`Message` never carry a store id or name -- only the other
 * participant's raw `user_id` -- and no endpoint resolves that `user_id`
 * back into a store. There is no facts-of-record way for a customer's
 * device to know "this conversation is with LifeSport Olmazor" beyond
 * remembering it itself, at the moment it opened that conversation via
 * `POST /chat/conversations/store/{storeId}` (the one call site that knows
 * both the conversation id and the real `StoreListItem` it just came from).
 *
 * This is therefore a per-browser convenience cache, never a source of
 * truth: a conversation opened on a different device, or before this
 * feature existed, simply has no cached store and falls back to a generic
 * label. Never fabricated, never a guess.
 */

const STORE_CACHE_PREFIX = "chat:store:";
/** Older, name-only cache written by `MessageStoreButton` before this file existed -- still read as a fallback so conversations opened before this change keep a label. */
const LEGACY_NAME_PREFIX = "chat:storeName:";

export interface CachedStoreSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string;
  district: string;
  address: string;
  isOpenNow: boolean;
  color?: string;
}

export function cacheConversationStore(conversationId: string, store: CachedStoreSummary): void {
  try {
    window.localStorage.setItem(`${STORE_CACHE_PREFIX}${conversationId}`, JSON.stringify(store));
  } catch {
    // Per-browser convenience cache only -- a failed write just means this conversation later shows a generic label.
  }
}

export function getCachedConversationStore(conversationId: string): CachedStoreSummary | null {
  try {
    const raw = window.localStorage.getItem(`${STORE_CACHE_PREFIX}${conversationId}`);
    if (raw) return JSON.parse(raw) as CachedStoreSummary;
    const legacyName = window.localStorage.getItem(`${LEGACY_NAME_PREFIX}${conversationId}`);
    if (legacyName) return { id: "", name: legacyName, slug: "", logoUrl: null, city: "", district: "", address: "", isOpenNow: false };
    return null;
  } catch {
    return null;
  }
}
