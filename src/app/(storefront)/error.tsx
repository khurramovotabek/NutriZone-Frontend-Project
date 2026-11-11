"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, LayoutGrid, RotateCw } from "lucide-react";

/**
 * Storefront-wide error boundary. Without it a single failed backend read (a deploy swap, a rate-limit burst)
 * replaced the whole page with Next's bare "This page couldn't load". It renders inside the storefront layout,
 * so header, search and footer stay; "Retry" re-runs the server render of this segment.
 */
export default function StorefrontError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("common");
  const tNav = useTranslations("navigation");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const again = () => {
    setBusy(true);
    router.refresh();
    retry();
    setTimeout(() => setBusy(false), 1500);
  };

  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-6 -z-10 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">{t("errorMessage")}</p>
      <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-3">
        <button type="button" onClick={again} disabled={busy} className="nz-cta nz-shimmer-btn flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70">
          <RotateCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} strokeWidth={2} aria-hidden="true" />
          {t("retry")}
        </button>
        <Link href="/products" className="nz-liquid nz-liquid-tile flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-ink">
          <LayoutGrid className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {tNav("catalog")}
        </Link>
        <Link href="/" className="nz-liquid nz-liquid-tile flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-ink">
          <Home className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {tNav("homepage")}
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-ink-soft">#{error.digest}</p>}
    </div>
  );
}
