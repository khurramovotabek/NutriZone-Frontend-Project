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

/** The phone row: first, current and last page only ("1 … 5 … 34"), all of them when there are five or fewer. */
export function buildCompactPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = Array.from(new Set([1, current, total])).sort((x, y) => x - y);
  const out: (number | "ellipsis")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(p - pages[i - 1] === 2 ? p - 1 : "ellipsis");
    out.push(p);
  });
  return out;
}
