"use client";

import dynamic from "next/dynamic";

/**
 * `next/dynamic`'s `ssr: false` option is only usable from a Client
 * Component (App Router restriction) -- this thin wrapper is what lets
 * the server-rendered store detail page (`store/[slug]/page.tsx`) still
 * code-split Leaflet (and its CSS) into its own chunk, loaded only when
 * a visitor actually scrolls to the Location section, instead of every
 * store-page visitor downloading the map library upfront. Loading
 * fallback matches StoreLocationMap's own not-mounted skeleton exactly.
 */
const StoreLocationMap = dynamic(() => import("@/components/StoreLocationMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-2 sm:h-72" aria-hidden="true" />,
});

export default StoreLocationMap;
