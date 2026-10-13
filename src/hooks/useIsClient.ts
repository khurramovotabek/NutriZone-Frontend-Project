"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and hydration, true afterwards -- for portals and
 * other browser-only output. Replaces the `useEffect(() => setMounted(true))`
 * pattern without the extra post-mount render pass.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
