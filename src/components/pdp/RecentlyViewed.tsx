"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import ProductRail from "@/components/ProductRail";

const KEY = "nz:recently-viewed:v1";
const MAX = 16;
const TTL = 1000 * 60 * 60 * 24 * 45; // a 45-day-old visit is no longer "recent"

type Entry = { card: ProductCard; brand: string | null; at: number };

function read(): Entry[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((e) => e?.card?.id && e?.card?.slug && Date.now() - Number(e.at) < TTL) : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // private mode / storage full: the rail is a convenience, never an error
  }
}

/**
 * "Siz ko'rgan mahsulotlar": remembers this product in the shopper's own browser (localStorage, no account needed,
 * never sent anywhere) and shows the other products they looked at recently, newest first. `product` is the
 * card-level slice of the product -- the page trims variants and long texts before passing it.
 */
export default function RecentlyViewed({ product, brandName }: { product: ProductCard; brandName: string | null }) {
  const t = useTranslations("product");
  const [others, setOthers] = useState<Entry[]>([]);

  useEffect(() => {
    const previous = read().filter((e) => e.card.id !== product.id);
    setOthers(previous); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only storage
    write([{ card: product, brand: brandName, at: Date.now() }, ...previous]);
  }, [product, brandName]);

  if (others.length === 0) return null;
  const brandNames = Object.fromEntries(others.filter((e) => e.card.brand_id && e.brand).map((e) => [e.card.brand_id as string, e.brand as string]));

  function clear() {
    write(read().filter((e) => e.card.id === product.id));
    setOthers([]);
  }

  return (
    <div className="mt-6">
      <ProductRail
        id="recently-viewed"
        icon={<History className="h-5 w-5" strokeWidth={1.9} />}
        tone="amber"
        title={t("recentTitle")}
        subtitle={t("recentHint")}
        products={others.map((e) => e.card)}
        brandNames={brandNames}
        prevLabel={t("railPrev")}
        nextLabel={t("railNext")}
      />
      <div className="mt-1 text-right">
        <button type="button" onClick={clear} className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-primary hover:underline">{t("recentClear")}</button>
      </div>
    </div>
  );
}
