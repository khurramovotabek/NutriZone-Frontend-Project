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
  children: CategoryNode[];
}

/**
 * The real category tree from the flat parent_id list: top sections (Sport ozuqalari, Vitaminlar, ...) → sections
 * (Proteinlar, Kreatin, ...) → product types (Whey, Isolate, ...). Orphans (parent hidden or deleted) show at the top.
 */
function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: CategoryNode[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    list.forEach((n) => sort(n.children));
    return list;
  };
  return sort(roots);
}

const categoryHref = (c: Category) => `/categories/${c.id}`;

export default function CatalogButton({ categories }: { categories: Category[] }) {
  const t = useTranslations("catalog");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const tree = buildCategoryTree(categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tree.find((c) => c.id === activeId) ?? tree[0];

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
            className="nz-glass-strong animate-nz-catalog-in absolute left-0 top-full z-50 mt-3 hidden max-h-[75vh] w-[min(92vw,960px)] overflow-y-auto rounded-3xl p-6 sm:block"
          >
            <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-6">
              <ul className="flex flex-col gap-1 border-r border-border pr-4" role="tablist" aria-orientation="vertical">
                {tree.map((cat) => {
                  const on = cat.id === active?.id;
                  return (
                    <li key={cat.id}>
                      <Link
                        href={categoryHref(cat)}
                        role="tab"
                        aria-selected={on}
                        onMouseEnter={() => setActiveId(cat.id)}
                        onFocus={() => setActiveId(cat.id)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${on ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-2"}`}
                      >
                        <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {active && (
                <div role="tabpanel" className="min-w-0">
                  <Link href={categoryHref(active)} className="mb-4 inline-flex items-center gap-1.5 text-lg font-bold text-ink hover:text-primary">
                    {active.name}
                    <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </Link>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                    {active.children.map((section) => (
                      <div key={section.id} className="min-w-0">
                        <Link href={categoryHref(section)} className="block truncate text-sm font-semibold text-ink transition-colors hover:text-primary">
                          {section.name}
                        </Link>
                        {section.children.length > 0 && (
                          <ul className="mt-1.5 flex flex-col gap-0.5">
                            {section.children.map((leaf) => (
                              <li key={leaf.id}>
                                <Link href={categoryHref(leaf)} className="block truncate rounded-md py-0.5 text-[13px] text-ink-muted transition-colors hover:text-primary">
                                  {leaf.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

function MobileCategoryGroup({ category, depth = 0 }: { category: CategoryNode; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("catalog");
  const hasChildren = category.children.length > 0;
  return (
    <div className={depth === 0 ? "border-b border-border py-1" : ""}>
      <div className="flex items-center">
        <Link
          href={categoryHref(category)}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 ${depth === 0 ? "py-3 text-sm font-semibold text-ink" : depth === 1 ? "py-2 text-sm font-medium text-ink" : "py-1.5 text-[13px] text-ink-muted"}`}
        >
          {depth === 0 && <Package className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />}
          <span className="truncate">{category.name}</span>
        </Link>
        {hasChildren && (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-label={category.name}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div className={`${depth === 0 ? "ml-7" : "ml-4"} flex flex-col pb-1`}>
          {category.children.map((child) => (
            <MobileCategoryGroup key={child.id} category={child} depth={depth + 1} />
          ))}
          {depth === 0 && (
            <Link href={categoryHref(category)} className="px-2 py-2 text-xs font-semibold text-primary">
              {t("viewAllProducts")} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
