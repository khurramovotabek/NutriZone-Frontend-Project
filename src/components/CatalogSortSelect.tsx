"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CatalogSort } from "@/lib/api";
import { catalogHref, type CatalogState } from "@/lib/catalog-params";
import { Select } from "@/components/ui";

/** The catalog's sort order -- kept in the URL like every filter; "best match" is only offered (and is the default) when there's a search query. */
export default function CatalogSortSelect({ state }: { state: CatalogState }) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options: { value: CatalogSort; label: string }[] = [
    ...(state.q ? [{ value: "relevance" as const, label: t("sortRelevance") }] : []),
    { value: "-created_at", label: t("sortNewest") },
    { value: "-popularity", label: t("sortPopular") },
    { value: "-discount", label: t("sortDiscount") },
    { value: "price", label: t("sortPriceAsc") },
    { value: "-price", label: t("sortPriceDesc") },
    { value: "-rating", label: t("sortRating") },
    { value: "name", label: t("sortName") },
  ];
  const current = state.sort ?? (state.q ? "relevance" : "-created_at");

  return (
    <label className={`flex items-center gap-2 text-sm text-ink-muted transition-opacity ${pending ? "opacity-60" : ""}`}>
      <ArrowDownUp className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{t("sortBy")}</span>
      <Select
        value={current}
        onChange={(e) => startTransition(() => router.push(catalogHref(state, { sort: e.target.value as CatalogSort }), { scroll: false }))}
        wrapperClassName="inline-block"
        className="rounded-lg py-1.5 pl-3 pr-9 text-sm font-medium text-ink"
        aria-label={t("sortBy")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
