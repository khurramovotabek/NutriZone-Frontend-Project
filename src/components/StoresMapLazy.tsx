"use client";

import dynamic from "next/dynamic";

/** Code-splits Leaflet out of the stores list page; loads only when the map view is opened. */
const StoresMap = dynamic(() => import("@/components/StoresMap"), {
  ssr: false,
  loading: () => <div className="h-[460px] w-full animate-pulse rounded-3xl bg-surface-2 sm:h-[560px]" aria-hidden="true" />,
});

export default StoresMap;
