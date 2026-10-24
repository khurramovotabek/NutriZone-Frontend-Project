import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Page numbers to show: always the first and last page and a window around the current one, with at least five
 * numbers near either end ("1 2 3 4 5 … 34"), so every gap hidden behind "…" is at least two pages.
 */
export function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 4) {
    start = 2;
    end = 5;
  } else if (current >= total - 3) {
    start = total - 4;
    end = total - 1;
  }
  const out: (number | "ellipsis")[] = [1];
  if (start > 2) out.push("ellipsis");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

const SQUARE = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold tabular-nums transition-all duration-200";
const IDLE = "text-ink-muted hover:-translate-y-0.5 hover:bg-surface-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const OFF = "pointer-events-none text-ink-soft opacity-40";

/**
 * Premium catalogue pagination (server component): "Showing 25–48 of 812" summary, a glass pill with first / previous
 * / numbers / next / last, a compact "3 / 34" counter on phones. `hrefFor(page)` builds each link so every filter in
 * the URL survives the page change.
 */
export default async function CatalogPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  hrefFor,
  label,
}: {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("pagination");
  const current = Math.min(Math.max(1, page), totalPages);
  const from = pageSize ? (current - 1) * pageSize + 1 : null;
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
    <nav aria-label={label} className="mt-12 flex flex-col items-center gap-4">
      <div className="nz-glass flex items-center gap-1 rounded-2xl p-1.5 shadow-lg shadow-black/5">
        {edge(1, current === 1, t("first"), <ChevronsLeft className="h-4 w-4" aria-hidden="true" />)}
        {current > 1 ? (
          <Link href={hrefFor(current - 1)} rel="prev" className={`${SQUARE} ${IDLE} gap-1.5`}>
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
                {p === current ? (
                  <span aria-current="page" className={`${SQUARE} nz-cta scale-105`}>
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

        <span className="px-3 text-sm font-semibold tabular-nums text-ink sm:hidden" aria-current="page">
          {current} <span className="font-normal text-ink-soft">/ {totalPages}</span>
        </span>

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
        {edge(totalPages, current === totalPages, t("last"), <ChevronsRight className="h-4 w-4" aria-hidden="true" />)}
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
