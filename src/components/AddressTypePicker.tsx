"use client";

import { useTranslations } from "next-intl";
import { CUSTOMER_CREATABLE_ADDRESS_TYPES, ADDRESS_TYPE_ICONS, type AddressTypeValue } from "@/lib/address-type-config";

/**
 * Icon-based picker for creating an address -- shared by Address Book
 * and Checkout's new-address form so the two never diverge. Only
 * offers the real backend AddressType values a CUSTOMER should be
 * choosing from (never "warehouse", an internal/inventory concept --
 * see CUSTOMER_CREATABLE_ADDRESS_TYPES's own docstring).
 */
export default function AddressTypePicker({ value, onChange, disabled = false }: { value: AddressTypeValue; onChange: (value: AddressTypeValue) => void; disabled?: boolean }) {
  const t = useTranslations("account.addressTypes");

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CUSTOMER_CREATABLE_ADDRESS_TYPES.map((type) => {
        const Icon = ADDRESS_TYPE_ICONS[type];
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            aria-pressed={active}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors disabled:opacity-60 ${
              active ? "border-primary/50 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/30 hover:text-ink"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[11px] font-medium leading-tight">{t(type)}</span>
          </button>
        );
      })}
    </div>
  );
}
