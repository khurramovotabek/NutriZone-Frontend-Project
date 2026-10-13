import { Building2, Dumbbell, Home, PackageCheck, Warehouse, type LucideIcon } from "lucide-react";
import type { AddressTypeValue } from "@/lib/geo-api";
import { ADDRESS_TYPES } from "@/lib/geo-api";

/**
 * Icon + i18n-key pairing for the real, backend-enforced AddressType
 * enum (residential/office/commercial/warehouse/pickup_point) -- no
 * "study"/"school" option exists here since the backend's own
 * `CreateAddressSerializer` would reject anything outside these 5
 * values with a 422. Labels live under `account.addressTypes.*` in
 * messages/{en,ru,uz}.json.
 */
export const ADDRESS_TYPE_ICONS: Record<AddressTypeValue, LucideIcon> = {
  residential: Home,
  office: Building2,
  // NutriZone's own customer base skews fitness/gym -- a "Commercial"
  // delivery destination is far more often a gym floor than a generic
  // shopfront, so a dumbbell reads correctly at a glance where the
  // previous storefront icon didn't.
  commercial: Dumbbell,
  warehouse: Warehouse,
  pickup_point: PackageCheck,
};

/**
 * Real, product-required restriction: "warehouse" is a real backend
 * value (an existing address CAN already be one, e.g. seeded/admin
 * data -- AddressCard/ADDRESS_TYPE_ICONS above must still render it
 * correctly), but it's an internal/inventory concept that should never
 * be offered as a choice when a CUSTOMER creates their own delivery
 * address. This is a UI-only restriction; the real backend enum
 * (ADDRESS_TYPES/AddressTypeValue) is untouched.
 */
export const CUSTOMER_CREATABLE_ADDRESS_TYPES = ADDRESS_TYPES.filter((type) => type !== "warehouse");

export { ADDRESS_TYPES };
export type { AddressTypeValue };
