"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/components/WishlistContext";

interface Props {
  productId: string;
  initialWishlisted?: boolean;
  className?: string;
}

export default function WishlistButton({ productId, initialWishlisted = false, className = "" }: Props) {
  const t = useTranslations("wishlist");
  const router = useRouter();
  const wishlistCtx = useWishlist();
  const [localWishlisted, setWishlisted] = useState(initialWishlisted);
  const [pending, setPending] = useState(false);
  const [justToggled, setJustToggled] = useState(false);

  // Real, closed gap: `initialWishlisted` is a server-rendered default
  // that's only ever accurate on the Wishlist page and Product Detail
  // page (see WishlistContext.tsx's own docstring) -- everywhere else
  // it's just `false`. Once the shared client-side wishlist fetch
  // resolves, it's the authoritative source; a card whose product genuinely
  // isn't in it keeps showing an empty heart, correctly. Every local
  // toggle below also updates the context, so the two never disagree.
  const wishlisted = wishlistCtx?.isWishlisted(productId) ?? localWishlisted;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const next = !wishlisted;
    setWishlisted(next); // optimistic
    wishlistCtx?.setWishlisted(productId, next); // keep every other card for this same product in sync
    if (next) {
      setJustToggled(true);
      setTimeout(() => setJustToggled(false), 300);
    }

    try {
      if (next) {
        const res = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId }) });
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          setWishlisted(false);
          wishlistCtx?.setWishlisted(productId, false);
          return;
        }
        if (!res.ok) {
          setWishlisted(false); // revert on failure
          wishlistCtx?.setWishlisted(productId, false);
        }
      } else {
        const res = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
        if (!res.ok) {
          setWishlisted(true); // revert on failure
          wishlistCtx?.setWishlisted(productId, true);
        }
      }
      router.refresh();
    } catch {
      setWishlisted(!next); // revert on network error
      wishlistCtx?.setWishlisted(productId, !next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? t("remove") : t("add")}
      className={`nz-glass flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-70 ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-transform duration-300 ${justToggled ? "scale-125" : "scale-100"} ${wishlisted ? "fill-red-500 text-red-500" : "text-ink-soft"}`}
        strokeWidth={1.75}
      />
    </button>
  );
}
