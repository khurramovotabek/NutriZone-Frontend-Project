"use client";

import { useState } from "react";
import { Check, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { COMPARE_MAX, toggleCompare, useCompareList } from "@/lib/compare";

/** "Solishtirish" toggle on a product page; the floating CompareBar takes the shopper to the comparison. */
export default function CompareButton({ slug }: { slug: string }) {
  const t = useTranslations("compare");
  const list = useCompareList();
  const [full, setFull] = useState(false);
  const added = list.includes(slug);

  return (
    <button
      type="button"
      onClick={() => setFull(!toggleCompare(slug))}
      aria-pressed={added}
      title={full ? t("full", { max: COMPARE_MAX }) : undefined}
      className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        added ? "border-primary/50 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40 hover:text-primary"
      }`}
    >
      {added ? <Check className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> : <Scale className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
      {added ? t("added") : full ? t("full", { max: COMPARE_MAX }) : t("add")}
    </button>
  );
}
