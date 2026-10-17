"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import { formatWeight } from "@/lib/format-weight";
import MediaImage from "@/components/MediaImage";

type Variant = NonNullable<ProductCard["variants"]>[number];
type Flavour = NonNullable<Variant["flavour"]>;

interface Props {
  variants: Variant[];
  selectedId: string;
  onChange: (variantId: string) => void;
  disabled?: boolean;
}

const sizeKey = (v: Variant) => (v.weight_value !== null ? `${v.weight_value}|${v.weight_unit}` : "");
const flavourKey = (v: Variant) => v.flavour?.id ?? "";
const soldOut = (v: Variant) => v.stock_status === "out_of_stock" || v.stock_quantity === 0;

/** Comparable magnitude so sizes read small → large: 350 g, 700 g, 1.8 kg, 2.27 kg (counts and volumes likewise). */
function magnitude(v: Variant): number {
  const n = v.weight_value ?? 0;
  return v.weight_unit === "kg" || v.weight_unit === "l" ? n * 1000 : n;
}

/**
 * Size x flavour picker for one product family ("Olimp Complex Whey": 350 g … 2.27 kg × Chocolate, Strawberry …).
 * Every option stays clickable: choosing a size keeps the current flavour when that combination exists, otherwise it
 * moves to the closest one that does (in stock first) -- the shopper never lands on a combination that isn't sold.
 * Options that don't exist with the other current choice are dimmed; sold-out combinations are struck through.
 */
export default function VariantSelector({ variants, selectedId, onChange, disabled = false }: Props) {
  const t = useTranslations("product");
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const sizes = useMemo(() => {
    const seen = new Map<string, Variant>();
    for (const v of variants) if (sizeKey(v) && !seen.has(sizeKey(v))) seen.set(sizeKey(v), v);
    return [...seen.entries()].sort((a, b) => magnitude(a[1]) - magnitude(b[1]));
  }, [variants]);

  const flavours = useMemo(() => {
    const seen = new Map<string, Flavour>();
    for (const v of variants) if (v.flavour && !seen.has(v.flavour.id)) seen.set(v.flavour.id, v.flavour);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [variants]);

  if (!selected || (sizes.length < 2 && flavours.length < 2)) return null;

  const curSize = sizeKey(selected);
  const curFlavour = flavourKey(selected);
  const combo = (size: string, flavour: string) => variants.find((v) => sizeKey(v) === size && flavourKey(v) === flavour);

  function choose(dim: "size" | "flavour", key: string) {
    const exact = dim === "size" ? combo(key, curFlavour) : combo(curSize, key);
    if (exact) return onChange(exact.id);
    // keep the clicked option, take the best partner for it: in stock first, then the variant list order
    const pool = variants.filter((v) => (dim === "size" ? sizeKey(v) === key : flavourKey(v) === key));
    const best = pool.find((v) => !soldOut(v)) ?? pool[0];
    if (best) onChange(best.id);
  }

  return (
    <div className="space-y-4">
      {sizes.length > 1 && (
        <fieldset disabled={disabled}>
          <legend className="mb-2 flex items-baseline gap-1.5 text-sm font-semibold text-ink">
            {t("attributePackageSize")}
            <span className="font-normal text-ink-soft">— {formatWeight(selected.weight_value, selected.weight_unit)}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map(([key, sample]) => {
              const on = key === curSize;
              const match = flavours.length > 1 ? combo(key, curFlavour) : variants.find((v) => sizeKey(v) === key);
              const out = match ? soldOut(match) : false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => choose("size", key)}
                  aria-pressed={on}
                  title={!match ? t("optionUnavailable") : out ? t("optionSoldOut") : undefined}
                  className={`relative min-w-[4.5rem] rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                    on
                      ? "border-primary bg-primary-soft text-primary shadow-[0_0_0_3px_rgba(var(--nz-primary-rgb),0.15)]"
                      : match
                        ? "border-border bg-surface text-ink hover:border-primary/50"
                        : "border-dashed border-border bg-transparent text-ink-soft opacity-70 hover:opacity-100"
                  } ${out ? "line-through decoration-1" : ""}`}
                >
                  {formatWeight(sample.weight_value, sample.weight_unit) ?? sample.sku}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {flavours.length > 0 && (sizes.length > 0 || flavours.length > 1) && (
        <fieldset disabled={disabled}>
          <legend className="mb-2 flex items-baseline gap-1.5 text-sm font-semibold text-ink">
            {t("attributeFlavor")}
            {selected.flavour && <span className="font-normal text-ink-soft">— {selected.flavour.name}</span>}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {flavours.map((f) => {
              const on = f.id === curFlavour;
              const match = sizes.length > 1 ? combo(curSize, f.id) : variants.find((v) => flavourKey(v) === f.id);
              const out = match ? soldOut(match) : false;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => choose("flavour", f.id)}
                  aria-pressed={on}
                  title={!match ? t("optionUnavailable") : out ? t("optionSoldOut") : f.name}
                  className={`group flex min-w-0 items-center gap-2.5 rounded-xl border p-1.5 pr-2.5 text-left text-[13px] font-medium transition-all disabled:cursor-not-allowed ${
                    on
                      ? "border-primary bg-primary-soft text-primary shadow-[0_0_0_3px_rgba(var(--nz-primary-rgb),0.15)]"
                      : match
                        ? "border-border bg-surface text-ink hover:border-primary/50"
                        : "border-dashed border-border text-ink-soft opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5" style={{ backgroundColor: f.color_hex || undefined }}>
                    {f.image_url && <MediaImage src={f.image_url} alt="" fit="cover" sizes="32px" fallbackIcon={null} />}
                    {on && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 leading-tight ${out ? "line-through decoration-1" : ""}`}>{f.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
