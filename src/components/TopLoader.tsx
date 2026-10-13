"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Real, product-required capability: a colorful, animated progress
 * bar fixed to the very top edge of the viewport, exactly like
 * YouTube/GitHub's own navigation indicator. Runs entirely on the
 * client: every pathname/search-param change (a real, completed
 * client-side navigation, per Next.js App Router's own routing
 * events) triggers a quick "fill and fade" animation. No external
 * dependency (nprogress etc.) -- CSS transitions only.
 */
function TopLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
    // The route has already resolved by the time this effect runs
    // (pathname/searchParams only change post-navigation), so this is
    // purely a "just arrived" flourish, not a real in-flight request
    // indicator -- kept short and non-blocking.
    timeoutRef.current = setTimeout(() => setVisible(false), 500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  return (
    <div
      aria-hidden="true"
      className={`nz-top-loader fixed inset-x-0 top-0 z-[100] h-[3px] origin-left transform-gpu bg-gradient-to-r from-primary via-info to-primary bg-[length:200%_100%] transition-all ${
        visible ? "scale-x-100 opacity-100 duration-300 ease-out" : "scale-x-0 opacity-0 duration-150 ease-in"
      }`}
    />
  );
}

export default function TopLoader() {
  // useSearchParams() requires a Suspense boundary in the App Router --
  // this wrapper is invisible to callers (RootLayout just renders <TopLoader />).
  return (
    <Suspense fallback={null}>
      <TopLoaderInner />
    </Suspense>
  );
}
