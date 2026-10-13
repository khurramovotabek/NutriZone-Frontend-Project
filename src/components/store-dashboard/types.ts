export interface StoreMediaItem {
  id?: number;
  url: string;
  is_video: boolean;
  sort_order: number;
}

export interface StoreProductItem {
  id: number;
  product_variant_id: string;
  product_id: string;
  name: string;
  sku: string;
  image_url: string | null;
  quantity: number;
}

export interface WorkingHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

/** A date-specific override of the regular weekly schedule (holiday, one-off closure or special opening). Takes priority over `working_hours` for that exact date -- see Store.is_open_now()'s own docstring on the backend. */
export interface SpecialHoursEntry {
  date: string;
  open?: string;
  close?: string;
  closed?: boolean;
  note?: string;
}

export interface MyStore {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  phone_numbers: string[];
  email: string;
  telegram_username: string;
  instagram_username: string;
  address: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  working_hours: Record<string, WorkingHoursDay>;
  special_hours: SpecialHoursEntry[];
  media: StoreMediaItem[];
  products: StoreProductItem[];
  rating_average?: number | null;
  rating_count?: number;
  color?: string;
  tagline?: string;
  /** codes from the backend's STORE_AMENITIES (card_payment, parking, consultant, ...) */
  amenities?: string[];
  landmark?: string;
  pickup_enabled?: boolean;
  pickup_note?: string;
  is_open_now?: boolean;
  today_hours?: { open: string; close: string; closed: boolean; special?: boolean; note?: string };
  /** "owner" manages the store; "cashier" (linked to this kassa by a superadmin) only works the POS. */

  my_role?: "owner" | "cashier";
  kassa_name?: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const STORE_AMENITIES = ["card_payment", "cash", "online_payment", "installments", "parking", "consultant", "tasting", "pickup", "delivery", "wifi", "accessible"] as const;
export type StoreAmenity = (typeof STORE_AMENITIES)[number];

/** An online order this branch handles (GET /api/my-store/orders). */
export interface StoreOrderLine {
  variant_id: string;
  name: string;
  sku: string;
  image: string;
  quantity: number;
  total: string;
}

export interface StoreOrderStep {
  action: "confirm" | "start_processing" | "ship" | "deliver" | "hand_back";
  label: string;
}

export interface StoreOrder {
  number: string;
  status: string;
  status_label: string;
  method: "delivery" | "pickup";
  placed_at: string;
  assigned_at: string | null;
  customer: { name: string; phone: string };
  address: { line1: string; line2: string; city: string; latitude: number | null; longitude: number | null };
  comment: string;
  lines: StoreOrderLine[];
  units: number;
  total: string;
  currency: string;
  steps: StoreOrderStep[];
}

export interface StoreOrdersPayload {
  orders: StoreOrder[];
  counts: { active: number; new: number; ready: number; done: number };
  today: { done: number; revenue: string };
}

/** GET /api/my-store/report -- the branch's online-order performance vs the network (minutes are medians). */
export interface StoreReport {
  days: number;
  since: string;
  sla: number;
  me: {
    handled: number; pickup: number; delivery: number; done: number; done_pct: number; active: number; cancelled: number; returned: number;
    handed_back: number; handed_back_pct: number; accept_sla: number | null; accept_min: number | null; ready_min: number | null; revenue: string;
  };
  network: { accept_min: number | null; accept_sla: number | null; ready_min: number | null; done_pct: number; handed_back_pct: number; avg_handled: number; branches: number };
  series: { date: string; n: number }[];
  orders: { number: string; method: string; status: string; assigned_at: string; accept_min: number | null }[];
  hand_backs: { number: string; reason: string; actor: string; at: string }[];
}
