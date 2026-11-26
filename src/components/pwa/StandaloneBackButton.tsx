"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * The installed app has no browser back button (iPhone none at all, Android only the system gesture), so inner pages
 * get one in the header. CSS shows it only under html[data-standalone] (set before the first paint), so the site in
 * a normal browser never sees it. No history inside the app (opened from a shortcut / link) -> home.
 */
export default function StandaloneBackButton() {
  const t = useTranslations("pwa");
  const router = useRouter();
  const pathname = usePathname() || "/";
  if (pathname === "/" || pathname === "/ru" || pathname === "/en") return null;
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      aria-label={t("back")}
      className="nz-standalone-only -ml-1.5 h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors active:bg-ink/10"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
