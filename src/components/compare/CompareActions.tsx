"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { compareHref, setCompare } from "@/lib/compare";

/** Keeps the stored compare list in step with the (shareable) URL the page was opened with. */
export function CompareSync({ slugs }: { slugs: string[] }) {
  const key = slugs.join(",");
  useEffect(() => {
    setCompare(key ? key.split(",") : []);
  }, [key]);
  return null;
}

export function CompareRemove({ slug, slugs }: { slug: string; slugs: string[] }) {
  const t = useTranslations("compare");
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t("remove")}
      onClick={() => {
        const rest = slugs.filter((s) => s !== slug);
        setCompare(rest);
        router.replace(rest.length ? compareHref(rest) : "/compare");
      }}
      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-black/80"
    >
      <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
