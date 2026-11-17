"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";
import { loadCart, onCartAdded } from "@/lib/cart-events";

const SHOW_MS = 8000;

/**
 * After "Add to cart": a slim bar at the bottom -- "Added · 3 items · 450 000 so'm  [Cart] [Checkout]". It slides in
 * without covering the page, hides by itself after a few seconds (or on ×), and never shows on the cart / checkout.
 */
export default function CartAddedBar() {
  const t = useTranslations("cart.addedBar");
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<{ count: number; total: number | null } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => onCartAdded(() => {
    setOpen(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), SHOW_MS);
    loadCart(true).then((body) => {
      const items = (body?.data?.items ?? []).filter((i) => i.status !== "removed");
      const count = items.reduce((n, i) => n + i.quantity, 0);
      const priced = items.every((i) => i.price_reference);
      const total = priced && items.length ? items.reduce((s, i) => s + Number(i.price_reference!.unit_amount) * i.quantity, 0) : null;
      setSummary({ count, total });
    });
  }), []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const path = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const hidden = path.startsWith("/cart") || path.startsWith("/checkout");
  if (!open || hidden) return null;

  return (
    <div
      role="status" aria-live="polite"
      className="nz-tg-above-tabbar fixed inset-x-0 bottom-0 z-50 px-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[420px] sm:px-0"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="nz-cart-added-in flex items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2.5 pl-3 shadow-[0_18px_40px_-14px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-4.5 w-4.5" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-ink">{t("added")}</p>
          <p className="truncate text-[11px] text-ink-soft">
            {summary ? t("items", { count: summary.count }) : "…"}
            {summary?.total ? ` · ${formatPrice(summary.total, "UZS")}` : ""}
          </p>
        </div>
        <Link href="/cart" onClick={() => setOpen(false)} className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[13px] min-[400px]:flex font-semibold text-ink hover:text-primary" aria-label={t("cart")}>
          <ShoppingBag className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="hidden min-[440px]:inline">{t("cart")}</span>
        </Link>
        <Link href="/checkout" onClick={() => setOpen(false)} className="nz-cta flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-[13px] font-bold">
          {t("checkout")}
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-6 shrink-0 items-center justify-center text-ink-soft hover:text-ink" aria-label={t("close")}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
