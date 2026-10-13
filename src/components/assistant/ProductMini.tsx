"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle, Package, ShoppingCart, Star } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import { addToCart, priceLine } from "@/lib/cart-client";
import { emitCartUpdated } from "@/lib/cart-events";
import type { AssistantCard } from "./types";

function som(v: string | null): string {
  return Math.round(Number(v) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

/** A product the assistant recommended: photo, price, stock, open + add to cart (the site's own cart flow). */
export default function ProductMini({ card, onNavigate }: { card: AssistantCard; onNavigate?: () => void }) {
  const t = useTranslations("assistant");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "added" | "error">("idle");

  async function add() {
    if (!card.variant_id || state === "busy") return;
    setState("busy");
    try {
      const { res, body, line } = await addToCart(card.variant_id, 1);
      if (!res.ok || !body.success) {
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setState("error");
        return;
      }
      emitCartUpdated();
      if (line && body.meta?.authenticated) await priceLine(line.id).catch(() => null);
      setState("added");
    } catch {
      setState("error");
    }
  }

  const href = card.slug ? `/products/${card.slug}` : "/products";
  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-sm">
      <Link href={href} onClick={onNavigate} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
        <MediaImage src={card.image} alt={card.name} fit="contain" padding="p-1" sizes="64px" fallbackIcon={<Package className="h-6 w-6 text-ink-soft" aria-hidden="true" />} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} onClick={onNavigate} className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink hover:text-primary">{card.name}</Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          {card.brand && <span>{card.brand}</span>}
          {card.rating ? <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{card.rating.toFixed(1)}</span> : null}
          <span className={card.in_stock ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{card.in_stock ? t("inStock") : t("outOfStock")}</span>
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm font-bold tabular-nums text-ink">
            <span className="whitespace-nowrap">{card.price ? `${som(card.price)} ${t("currency")}` : "—"}</span>
            {card.compare_at_price && card.discount_percent ? <span className="whitespace-nowrap text-[11px] font-medium text-ink-soft line-through">{som(card.compare_at_price)}</span> : null}
          </p>
          <button
            type="button"
            onClick={add}
            disabled={!card.in_stock || !card.variant_id || state === "busy" || state === "added"}
            aria-label={t("addToCart", { name: card.name })}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${state === "added" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "nz-cta text-white disabled:opacity-50"}`}
          >
            {state === "busy" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : state === "added" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />}
            {state === "added" ? t("added") : state === "error" ? t("retry") : t("add")}
          </button>
        </div>
      </div>
    </article>
  );
}
