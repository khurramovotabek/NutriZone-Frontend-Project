"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Address } from "@/lib/geo-api";
import AddressCard from "@/components/checkout/AddressCard";
import AddressForm from "@/components/AddressForm";

/**
 * The real, existing Address Book form, reused wholesale inside
 * Checkout -- never a second, parallel address system, and never a
 * second copy of the Region -> City -> Address -> map flow (this used
 * to duplicate a map-less version of that form; see AddressForm.tsx's
 * own docstring for why that was closed). Listing/creation both call
 * the exact same `/api/addresses` route the Address Book page itself
 * uses. Recipient identity is Checkout's own responsibility (see
 * RecipientForm.tsx) -- this component never asks for it.
 */
export default function AddressSelector({
  addresses, selectedId, onSelect, onCreated,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (address: Address) => void;
}) {
  const t = useTranslations("account.addressesPage");
  const [showForm, setShowForm] = useState(addresses.length === 0);

  return (
    <div className="space-y-3">
      {addresses.length > 0 && (
        <div className="space-y-2.5">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} selected={selectedId === address.id} onSelect={() => onSelect(address.id)} />
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {t("addNew")}
        </button>
      ) : (
        <AddressForm
          mode="create"
          onSaved={(created) => {
            onCreated(created);
            setShowForm(false);
          }}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
        />
      )}

      {addresses.length === 0 && !showForm && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {t("emptyDescription")}
        </p>
      )}
    </div>
  );
}
