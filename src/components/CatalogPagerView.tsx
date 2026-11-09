"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { buildCompactPageNumbers, buildPageNumbers } from "@/lib/page-numbers";

const SQUARE = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold tabular-nums transition-all duration-200";
const IDLE = "text-ink-muted hover:-translate-y-0.5 hover:bg-surface-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const OFF = "pointer-events-none text-ink-soft opacity-40";

/**
 * Premium catalogue pagination: "Showing 25–72 of 812" summary, a glass pill with first / previous / numbers / next /
 * last, first-current-last numbers on phones. `hrefs[p - 1]` is page p's link (every filter in the URL survives).
 * `lastPage` > `page` when "show more" has appended the following pages: all of them are marked current and "next"
 * continues after the last one.
 */
export default function CatalogPagerView({
  page,
  lastPage,
  totalPages,
  totalCount,
  pageSize,
  hrefs,
  label,
  className = "mt-12",
}: {
  page: number;
  lastPage?: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  hrefs: string[];
  label: string;
  className?: string;
}) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;
  const first = Math.min(Math.max(1, page), totalPages);
  const current = Math.min(Math.max(first, lastPage ?? first), totalPages);
  const hrefFor = (p: number) => hrefs[p - 1] ?? hrefs[0];
  const loaded = (p: number) => p >= first && p <= current;
  const from = pageSize ? (first - 1) * pageSize + 1 : null;
  const to = pageSize && totalCount ? Math.min(current * pageSize, totalCount) : null;
  const percent = Math.round((current / totalPages) * 100);

  const edge = (target: number, disabled: boolean, text: string, icon: React.ReactNode, extra = "") =>
    disabled ? (
      <span aria-disabled="true" className={`${SQUARE} ${OFF} ${extra}`}>
        {icon}
        <span className="sr-only">{text}</span>
      </span>
    ) : (
      <Link href={hrefFor(target)} rel={target < current ? "prev" : "next"} aria-label={text} title={text} className={`${SQUARE} ${IDLE} ${extra}`}>
        {icon}
      </Link>
    );

  return (
    <nav aria-label={label} className={`${className} flex flex-col items-center gap-4`}>
      <div className="nz-glass flex items-center gap-1 rounded-2xl p-1.5 shadow-lg shadow-black/5">
        {edge(1, first === 1, t("first"), <ChevronsLeft className="h-4 w-4" aria-hidden="true" />, "max-sm:hidden")}
        {first > 1 ? (
          <Link href={hrefFor(first - 1)} rel="prev" className={`${SQUARE} ${IDLE} gap-1.5`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">{t("prev")}</span>
          </Link>
        ) : (
          <span aria-disabled="true" className={`${SQUARE} ${OFF} gap-1.5`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">{t("prev")}</span>
          </span>
        )}

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

        <ul className="hidden items-center gap-1 sm:flex">
          {buildPageNumbers(current, totalPages).map((p, idx) =>
            p === "ellipsis" ? (
              <li key={`gap-${idx}`} aria-hidden="true" className="flex h-10 w-8 items-center justify-center text-sm tracking-widest text-ink-soft">
                ···
              </li>
            ) : (
              <li key={p}>
                {loaded(p) ? (
                  <span aria-current={p === current ? "page" : undefined} className={`${SQUARE} nz-cta ${p === current ? "scale-105" : "opacity-80"}`}>
                    {p}
                  </span>
                ) : (
                  <Link href={hrefFor(p)} aria-label={t("goTo", { page: p })} className={`${SQUARE} ${IDLE}`}>
                    {p}
                  </Link>
                )}
              </li>
            ),
          )}
        </ul>

        {/* phones: first, current and last as tappable numbers instead of a bare "3 / 34" */}
        <ul className="flex items-center gap-0.5 sm:hidden">
          {buildCompactPageNumbers(current, totalPages).map((p, idx) =>
            p === "ellipsis" ? (
              <li key={`m-gap-${idx}`} aria-hidden="true" className="flex h-10 w-5 items-center justify-center text-xs text-ink-soft">
                ···
              </li>
            ) : (
              <li key={`m-${p}`}>
                {loaded(p) ? (
                  <span aria-current={p === current ? "page" : undefined} className={`${SQUARE} nz-cta !min-w-9 !px-2`}>
                    {p}
                  </span>
                ) : (
                  <Link href={hrefFor(p)} aria-label={t("goTo", { page: p })} className={`${SQUARE} ${IDLE} !min-w-9 !px-2`}>
                    {p}
                  </Link>
                )}
              </li>
            ),
          )}
        </ul>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

        {current < totalPages ? (
          <Link href={hrefFor(current + 1)} rel="next" className={`${SQUARE} ${IDLE} gap-1.5`}>
            <span className="hidden md:inline">{t("next")}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className={`${SQUARE} ${OFF} gap-1.5`}>
            <span className="hidden md:inline">{t("next")}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        {edge(totalPages, current === totalPages, t("last"), <ChevronsRight className="h-4 w-4" aria-hidden="true" />, "max-sm:hidden")}
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-ink-muted">
          {from && to && totalCount ? t("showing", { from, to, total: totalCount }) : t("pageOf", { page: current, total: totalPages })}
        </p>
      </div>
    </nav>
  );
}
