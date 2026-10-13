"use client";

import { Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Address } from "@/lib/geo-api";
import { ADDRESS_TYPE_ICONS, type AddressTypeValue } from "@/lib/address-type-config";

/**
 * Selectable address card -- the primary Checkout Address Book UI.
 * Real fields only: no fabricated label, no editable is_default (the
 * backend has no set-default endpoint, confirmed in geo-api.ts).
 * Recipient name/phone are deliberately NOT shown here -- Checkout's
 * own RecipientForm is the single place recipient identity is
 * collected/edited, never duplicated per-address.
 */
export default function AddressCard({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  const t = useTranslations("account.addressTypes");
  const tCheckout = useTranslations("checkout");
  const Icon = ADDRESS_TYPE_ICONS[address.address_type as AddressTypeValue] ?? ADDRESS_TYPE_ICONS.residential;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? "border-primary/60 bg-primary-soft" : "border-border hover:border-primary/30"}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-ink-soft"}`}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-ink">
              <Icon className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
              {t(address.address_type as AddressTypeValue)}
            </span>
            {address.is_default && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">{tCheckout("addressDefault")}</span>}
            {address.coordinate_latitude !== null && (
              <span className="nz-glass inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                <Navigation className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                {tCheckout("addressPreciseLocation")}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">{address.formatted_single_line ?? address.line1}</p>
        </div>
      </div>
    </button>
  );
}
