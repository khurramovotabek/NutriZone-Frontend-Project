import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Deliberately does NOT include a "Secure Payment" claim: confirmed
 * in a prior phase that no payment provider is integrated yet
 * (checkout creates an order but never reaches a payment step) --
 * including it would be a materially misleading claim. "Easy Returns"
 * is backed by the real, existing apps.ordering OrderReturn backend
 * aggregate, even though no frontend UI for it exists yet. The other
 * two are general business assertions, not software-feature claims.
 */
const ITEMS = [
  { icon: ShieldCheck, key: "original" },
  { icon: Truck, key: "delivery" },
  { icon: RotateCcw, key: "returns" },
] as const;

/** `compact`: three small tiles (icon over text) for narrow spots like the product page's gallery column. */
export default function TrustBar({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("trust");

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {ITEMS.map(({ icon: Icon, key }) => (
          <div key={key} className="nz-glass flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xs font-semibold leading-tight text-ink">{t(`${key}.title`)}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{t(`${key}.description`)}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="nz-glass grid grid-cols-1 gap-6 rounded-2xl p-6 sm:grid-cols-3">
      {ITEMS.map(({ icon: Icon, key }) => (
        <div key={key} className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{t(`${key}.title`)}</p>
            <p className="text-xs text-ink-muted">{t(`${key}.description`)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
