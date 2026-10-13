import { Accessibility, Banknote, Bike, Car, CreditCard, CupSoda, Dumbbell, HandCoins, ShoppingBag, Smartphone, Wifi, type LucideIcon } from "lucide-react";
import type { StoreAmenity } from "./types";

/** One icon per store amenity -- the dashboard picker and the public store page draw the same chips. */
export const AMENITY_ICONS: Record<StoreAmenity, LucideIcon> = {
  card_payment: CreditCard, cash: Banknote, online_payment: Smartphone, installments: HandCoins, parking: Car, consultant: Dumbbell,
  tasting: CupSoda, pickup: ShoppingBag, delivery: Bike, wifi: Wifi, accessible: Accessibility,
};
