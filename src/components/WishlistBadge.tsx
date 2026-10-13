"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/components/WishlistContext";

/**
 * Mobile header wishlist icon with a real count badge -- same visual
 * pattern as CartBadge, sourcing its count from the already-loaded
 * WishlistContext (one shared client-side fetch mounted once in the
 * storefront layout, see WishlistContext.tsx) instead of a second,
 * redundant fetch. `ids === null` (not yet resolved, or guest with no
 * session) shows no badge at all -- never a fabricated 0 or stale count.
 */
export default function WishlistBadge() {
  const t = useTranslations("navigation");
  const wishlist = useWishlist();
  const count = wishlist?.ids?.size ?? null;

  return (
    <Link
      href="/wishlist"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-primary"
      aria-label={count ? `${t("wishlist")}, ${count}` : t("wishlist")}
    >
      <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      {count !== null && count > 0 && (
        <span className="nz-cta absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
