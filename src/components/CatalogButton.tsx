"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutGrid, Package, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Category } from "@/lib/api";

interface CategoryNode extends Category {
  children: Category[];
}

/**
 * Real, product-required capability: groups the existing flat
 * Category[] (parent_id-based, already the real backend hierarchy)
 * into top-level categories with their direct children -- no
 * fabricated "Sport Nutrition/Vitamins/Accessories" groups, since the
 * real category tree may look entirely different. Deeper-than-2-level
 * nesting is deliberately flattened under its nearest top-level
 * ancestor -- this menu is a fast-navigation shortcut, not a full
 * category browser (that's the Catalog page's own filter sidebar).
 */
function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const topLevel = categories.filter((c) => !c.parent_id || !byId.has(c.parent_id));
  const childrenByTopId = new Map<string, Category[]>();

  for (const cat of categories) {
    if (!cat.parent_id) continue;
    let ancestor = byId.get(cat.parent_id);
    let current = cat;
    // Walk up to the nearest top-level ancestor for anything nested deeper than one level.
    while (ancestor && ancestor.parent_id && byId.has(ancestor.parent_id)) {
      current = ancestor;
      ancestor = byId.get(ancestor.parent_id);
    }
    const topId = ancestor ? ancestor.id : current.parent_id!;
    if (!childrenByTopId.has(topId)) childrenByTopId.set(topId, []);
    if (cat.id !== topId) childrenByTopId.get(topId)!.push(cat);
  }

  return topLevel
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((top) => ({ ...top, children: (childrenByTopId.get(top.id) || []).sort((a, b) => a.sort_order - b.sort_order) }));
}

export default function CatalogButton({ categories }: { categories: Category[] }) {
  const t = useTranslations("catalog");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const tree = buildCategoryTree(categories);

  // Close on navigation (adjusted during render, not in an effect).
  const [openedOnPath, setOpenedOnPath] = useState(pathname);
  if (pathname !== openedOnPath) {
    setOpenedOnPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // `drawerRef` covers the portaled mobile drawer (see its own comment) --
      // without it, every click inside that drawer (e.g. expanding a category)
      // looks like an outside click since it no longer lives under `containerRef`.
      if (containerRef.current?.contains(target) || drawerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = window.innerWidth < 640 ? "hidden" : "";
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="nz-catalog-panel"
        className={`nz-shimmer-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
          open ? "nz-cta" : "nz-glass text-ink hover:-translate-y-px hover:border-primary hover:text-primary"
        }`}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden sm:inline">{t("katalogButton")}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Desktop backdrop stays here (unportaled): the desktop panel right
              below it is intentionally `absolute`-anchored to this button's
              own DOM position, not portaled -- see the mobile drawer's own
              comment for why `fixed`/`absolute` descendants of the `nz-glass`
              header need a portal but this `absolute` mega-menu doesn't. */}
          <div className="fixed inset-0 z-40 hidden bg-black/20 sm:block" aria-hidden="true" onClick={() => setOpen(false)} />

          {/* Desktop: floating mega menu */}
          <div
            id="nz-catalog-panel"
            role="menu"
            className="nz-glass-strong animate-nz-catalog-in absolute left-0 top-full z-50 mt-3 hidden max-h-[70vh] w-[min(90vw,880px)] overflow-y-auto rounded-3xl p-6 sm:block"
          >
            <h2 className="mb-5 text-xl font-semibold text-ink">{t("katalogButton")}</h2>
            <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(tree.length, 3)}, minmax(0, 1fr))` }}>
              {tree.slice(0, 6).map((cat) => (
                <div key={cat.id} className="group">
                  <Link href={`/products?category=${cat.id}`} className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-ink transition-colors hover:text-primary">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 transition-all group-hover:border-primary/40 group-hover:shadow-[0_0_12px_rgba(var(--nz-primary-rgb),0.25)]">
                      <Package className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    {cat.name}
                  </Link>
                  <ul className="flex flex-col gap-1.5">
                    {cat.children.slice(0, 6).map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/products?category=${child.id}`}
                          className="group/link flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          {child.name}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover/link:translate-x-0.5 group-hover/link:opacity-100" strokeWidth={2} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-border pt-4 text-center">
              <Link href="/products" className="text-sm font-medium text-ink-muted transition-colors hover:text-primary">
                {t("viewAllProducts")} &rarr;
              </Link>
            </div>
          </div>

          {/* Mobile: full-height drawer -- portaled to document.body, live-
              verified necessary: this button renders inside
              `<header className="nz-glass ...">`, and `nz-glass` sets
              `backdrop-filter`, which per spec makes its own element a new
              containing block for `position: fixed` descendants. Without the
              portal this panel's `fixed inset-y-0` resolved against the
              header's own ~62px-tall box instead of the real viewport (the
              exact bug confirmed live for MobileNav.tsx's own drawer, same
              root cause, same fix -- see that file's own comment). */}
          {mounted &&
            createPortal(
              <>
                <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
                <div ref={drawerRef} className="nz-glass-strong fixed inset-y-0 right-0 z-50 flex w-[86vw] max-w-sm animate-nz-drawer-in flex-col border-y-0 border-r-0 sm:hidden">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <h2 className="text-lg font-semibold text-ink">{t("katalogButton")}</h2>
                    <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2">
                      <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {tree.map((cat) => (
                      <MobileCategoryGroup key={cat.id} category={cat} />
                    ))}
                  </div>
                  <div className="border-t border-border p-4">
                    <Link href="/products" className="nz-glass block rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
                      {t("viewAllProducts")}
                    </Link>
                  </div>
                </div>
              </>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}

function MobileCategoryGroup({ category }: { category: CategoryNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-border py-1">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left text-sm font-semibold text-ink">
        <span className="flex items-center gap-2.5">
          <Package className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
          {category.name}
        </span>
        {category.children.length > 0 && (
          <ChevronRight className={`h-4 w-4 text-ink-soft transition-transform ${expanded ? "rotate-90" : ""}`} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
      {expanded && category.children.length > 0 && (
        <ul className="ml-9 flex flex-col gap-1 pb-2">
          {category.children.map((child) => (
            <li key={child.id}>
              <Link href={`/products?category=${child.id}`} className="block rounded-lg px-2 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink">
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {category.children.length === 0 && (
        <Link href={`/products?category=${category.id}`} className="ml-9 block pb-2 text-sm text-ink-muted hover:text-ink" />
      )}
    </div>
  );
}
