"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import MediaImage from "@/components/MediaImage";

type Flavour = NonNullable<ProductCard["flavours"]>[number];

interface Props {
  flavours: Flavour[];
}

/**
 * PDP flavour switcher -- selecting a flavour swatch navigates to the
 * sibling Product that carries it (see api.ts::ProductCard.flavours'
 * own docstring for why this is cross-Product navigation, not a local
 * selection state, unlike VariantSelector's Size chips). The current
 * product's own tagged flavour(s) render as a non-interactive,
 * highlighted state. Renders nothing for a product with no flavour
 * data at all, so a not-yet-tagged product never shows an empty row.
 */
export default function FlavourSwitcher({ flavours }: Props) {
  const t = useTranslations("product");
  if (flavours.length === 0) return null;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-muted">
        {t("attributeFlavor")}
        {(() => {
          const current = flavours.find((f) => f.is_current);
          return current ? <span className="ml-1.5 font-normal text-ink-soft">— {current.name}</span> : null;
        })()}
      </label>
      <div className="flex flex-wrap gap-2">
        {flavours.map((f) => {
          const swatch = (
            <span
              className={`relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl transition-all ${
                f.is_current ? "nz-glass-strong ring-2 ring-primary" : "nz-glass hover:ring-1 hover:ring-primary/50"
              }`}
            >
              {f.image_url ? (
                <MediaImage src={f.image_url} alt={f.name} fit="cover" fallbackIcon={<ColorFallback colorHex={f.color_hex} />} />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <ColorFallback colorHex={f.color_hex} />
                </span>
              )}
            </span>
          );

          if (f.is_current) {
            return (
              <span key={f.id} aria-current="true" aria-label={f.name} title={f.name}>
                {swatch}
              </span>
            );
          }

          return (
            <Link key={f.id} href={`/products/${f.product_slug}`} aria-label={f.name} title={f.name}>
              {swatch}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ColorFallback({ colorHex }: { colorHex: string | null }) {
  if (colorHex) {
    return <span className="block h-full w-full" style={{ backgroundColor: colorHex }} aria-hidden="true" />;
  }
  return <span className="block h-full w-full bg-surface-2" aria-hidden="true" />;
}
