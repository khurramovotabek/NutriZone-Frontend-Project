"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, SlidersHorizontal, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CatalogFacets, Category } from "@/lib/api";
import { activeFilterCount, catalogHref, toggle, type CatalogState } from "@/lib/catalog-params";
import { formatSizeKey } from "@/lib/format-weight";

const COLLAPSED_LIMIT = 6;

interface Props {
  state: CatalogState;
  facets: CatalogFacets | undefined;
  /** Full category list -- the fallback when facets carry no category data (e.g. an API error). */
  categories: Category[];
}

/**
 * The catalog's filter surface: category, brand, price range, rating,
 * flavour, size and availability -- every option showing how many
 * products it would yield (backend facets, each dimension counted with
 * the *other* active filters applied). All state is in the URL (see
 * lib/catalog-params.ts); a change navigates, and the server page
 * re-renders the grid. Sticky sidebar on desktop, bottom sheet on mobile.
 */
export default function CatalogFilterPanel({ state, facets, categories }: Props) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = activeFilterCount(state);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function go(changes: Partial<CatalogState>) {
    startTransition(() => router.push(catalogHref(state, changes), { scroll: false }));
  }

  const categoryOptions = facets?.category?.length ? facets.category : categories.map((c) => ({ id: c.id, name: c.name, count: undefined as number | undefined }));

  const body = (
    <div className={`transition-opacity ${pending ? "pointer-events-none opacity-60" : ""}`} aria-busy={pending}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
          {t("filters")}
          {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{activeCount}</span>}
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" aria-hidden="true" />}
        </h2>
        {activeCount > 0 && (
          <button type="button" onClick={() => go({ category: undefined, brands: [], flavours: [], sizes: [], goals: [], min: undefined, max: undefined, rating: undefined, stock: false, sale: false })} className="text-xs font-medium text-primary hover:underline">
            {t("clearAll")}
          </button>
        )}
      </div>

      <Section title={t("filterCategory")}>
        <OptionList
          items={[{ id: "", name: t("allCategories"), count: undefined }, ...categoryOptions]}
          isActive={(id) => (id ? state.category === id : !state.category)}
          onPick={(id) => go({ category: id || undefined })}
          kind="radio"
          moreLabel={(n) => t("showMore", { count: n })}
          lessLabel={t("showLess")}
        />
      </Section>

      <Section title={t("filterPrice")}>
        <PriceRange state={state} facets={facets} onApply={(min, max) => go({ min, max })} />
      </Section>

      {(facets?.brand?.length ?? 0) > 0 && (
        <Section title={t("filterBrand")} badge={state.brands.length}>
          <OptionList
            items={facets!.brand!.map((b) => ({ id: b.id, name: b.name, count: b.count }))}
            isActive={(id) => state.brands.includes(id)}
            onPick={(id) => go({ brands: toggle(state.brands, id) })}
            kind="checkbox"
            searchPlaceholder={facets!.brand!.length > COLLAPSED_LIMIT ? t("searchBrands") : undefined}
            moreLabel={(n) => t("showMore", { count: n })}
            lessLabel={t("showLess")}
          />
        </Section>
      )}

      {(facets?.rating?.length ?? 0) > 0 && (
        <Section title={t("filterRating")} badge={state.rating ? 1 : 0}>
          <div className="flex flex-col gap-0.5">
            {facets!.rating!.map((r) => {
              const active = state.rating === r.min;
              return (
                <button
                  key={r.min}
                  type="button"
                  disabled={!active && r.count === 0}
                  onClick={() => go({ rating: active ? undefined : r.min })}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${active ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
                >
                  <span className="flex" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= r.min ? "fill-amber-400 text-amber-400" : "text-ink-soft/40"}`} strokeWidth={1.5} />
                    ))}
                  </span>
                  <span className="flex-1">{t("ratingAndUp", { stars: r.min })}</span>
                  <Count value={r.count} />
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {(facets?.flavour?.length ?? 0) > 0 && (
        <Section title={t("filterFlavour")} badge={state.flavours.length}>
          <OptionList
            items={facets!.flavour!.map((f) => ({ id: f.id, name: f.name, count: f.count, swatch: f.color_hex }))}
            isActive={(id) => state.flavours.includes(id)}
            onPick={(id) => go({ flavours: toggle(state.flavours, id) })}
            kind="checkbox"
            moreLabel={(n) => t("showMore", { count: n })}
            lessLabel={t("showLess")}
          />
        </Section>
      )}

      {(facets?.size?.length ?? 0) > 0 && (
        <Section title={t("filterSize")} badge={state.sizes.length}>
          <div className="flex flex-wrap gap-1.5">
            {facets!.size!.map((s) => {
              const active = state.sizes.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!active && s.count === 0}
                  onClick={() => go({ sizes: toggle(state.sizes, s.id) })}
                  aria-pressed={active}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${active ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/50 hover:text-ink"}`}
                >
                  {formatSizeKey(s.id)} <span className="text-ink-soft">({s.count})</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t("filterAvailability")} last>
        <button type="button" role="switch" aria-checked={state.sale} onClick={() => go({ sale: !state.sale })} className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">%</span>
            {t("onSaleOnly")}
          </span>
          <span className="flex items-center gap-2">
            {facets?.on_sale_count !== undefined && <Count value={facets.on_sale_count} />}
            <span className={`relative h-5 w-9 rounded-full transition-colors ${state.sale ? "bg-rose-600" : "bg-surface-3"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${state.sale ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </span>
        </button>
        <button type="button" role="switch" aria-checked={state.stock} onClick={() => go({ stock: !state.stock })} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
          <span>{t("inStockOnly")}</span>
          <span className="flex items-center gap-2">
            {facets?.in_stock_count !== undefined && <Count value={facets.in_stock_count} />}
            <span className={`relative h-5 w-9 rounded-full transition-colors ${state.stock ? "bg-primary" : "bg-surface-3"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${state.stock ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </span>
        </button>
      </Section>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="nz-glass sticky top-[90px] max-h-[calc(100vh-110px)] overflow-y-auto rounded-2xl p-5 [scrollbar-width:thin]">{body}</div>
      </aside>

      {/* Mobile/tablet: trigger */}
      <button type="button" onClick={() => setMobileOpen(true)} className="nz-glass mb-4 flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary lg:hidden">
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {t("filters")}
        {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{activeCount}</span>}
      </button>

      {/* Mobile/tablet: bottom sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("filters")}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="nz-glass-strong animate-nz-sheet-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setMobileOpen(false)} aria-label={t("closeFilters")} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2">
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, badge = 0, last = false, children }: { title: string; badge?: number; last?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`py-3.5 ${last ? "" : "border-b border-border"} first:pt-0`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {title}
          {badge > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </section>
  );
}

function Count({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  return <span className="min-w-6 rounded-md bg-surface-2 px-1.5 py-0.5 text-center text-[11px] font-medium tabular-nums text-ink-soft">{value}</span>;
}

interface Option {
  id: string;
  name: string;
  count: number | undefined;
  swatch?: string;
}

function OptionList({
  items,
  isActive,
  onPick,
  kind,
  searchPlaceholder,
  moreLabel,
  lessLabel,
}: {
  items: Option[];
  isActive: (id: string) => boolean;
  onPick: (id: string) => void;
  kind: "radio" | "checkbox";
  searchPlaceholder?: string;
  moreLabel: (n: number) => string;
  lessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needle, setNeedle] = useState("");
  const filtered = needle ? items.filter((i) => i.name.toLowerCase().includes(needle.toLowerCase())) : items;
  // Selected options always stay visible, even beyond the collapsed limit.
  const visible = expanded || needle ? filtered : filtered.filter((item, idx) => idx < COLLAPSED_LIMIT || isActive(item.id));
  const hidden = filtered.length - visible.length;

  return (
    <div>
      {searchPlaceholder && (
        <input type="search" value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder={searchPlaceholder} className="nz-glass-input mb-2 w-full rounded-lg px-3 py-1.5 text-sm" />
      )}
      <div className="flex flex-col gap-0.5">
        {visible.map((item) => {
          const active = isActive(item.id);
          const disabled = !active && item.count === 0;
          return (
            <button
              key={item.id || "all"}
              type="button"
              role={kind}
              aria-checked={active}
              disabled={disabled}
              onClick={() => onPick(item.id)}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${active ? "bg-primary-soft font-medium text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${kind === "radio" ? "rounded-full" : "rounded"} ${active ? "border-primary bg-primary text-white" : "border-border-hover"}`}
              >
                {active && (kind === "radio" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : <Check className="h-3 w-3" strokeWidth={3} />)}
              </span>
              {item.swatch && <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.swatch }} />}
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <Count value={item.count} />
            </button>
          );
        })}
      </div>
      {!needle && (hidden > 0 || expanded) && filtered.length > COLLAPSED_LIMIT && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1.5 px-2 text-xs font-medium text-primary hover:underline">
          {expanded ? lessLabel : moreLabel(hidden)}
        </button>
      )}
    </div>
  );
}

function PriceRange({ state, facets, onApply }: { state: CatalogState; facets: CatalogFacets | undefined; onApply: (min?: string, max?: string) => void }) {
  const t = useTranslations("catalog");
  const [min, setMin] = useState(state.min ?? "");
  const [max, setMax] = useState(state.max ?? "");
  const floor = facets?.price_range?.min ? Math.floor(Number(facets.price_range.min)) : undefined;
  const ceil = facets?.price_range?.max ? Math.ceil(Number(facets.price_range.max)) : undefined;
  const fmt = (v: number) => v.toLocaleString("ru-RU").replace(/ /g, " ");
  const digits = (v: string) => v.replace(/\D/g, "");
  const dirty = digits(min) !== (state.min ?? "") || digits(max) !== (state.max ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(digits(min) || undefined, digits(max) || undefined);
      }}
    >
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("priceFrom")}</span>
          <input inputMode="numeric" value={min ? fmt(Number(digits(min))) : ""} onChange={(e) => setMin(digits(e.target.value))} placeholder={floor !== undefined ? `${t("priceFrom")} ${fmt(floor)}` : t("priceFrom")} className="nz-glass-input w-full rounded-lg px-2.5 py-1.5 text-sm tabular-nums" />
        </label>
        <span className="text-ink-soft" aria-hidden="true">–</span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("priceTo")}</span>
          <input inputMode="numeric" value={max ? fmt(Number(digits(max))) : ""} onChange={(e) => setMax(digits(e.target.value))} placeholder={ceil !== undefined ? `${t("priceTo")} ${fmt(ceil)}` : t("priceTo")} className="nz-glass-input w-full rounded-lg px-2.5 py-1.5 text-sm tabular-nums" />
        </label>
      </div>
      {floor !== undefined && ceil !== undefined && <p className="mt-1.5 text-[11px] text-ink-soft">{t("priceRangeHint", { min: fmt(floor), max: fmt(ceil) })}</p>}
      {dirty && (
        <button type="submit" className="nz-cta mt-2 w-full rounded-lg py-1.5 text-sm font-semibold">
          {t("apply")}
        </button>
      )}
    </form>
  );
}
