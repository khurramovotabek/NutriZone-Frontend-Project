export interface PosCatalogItem {
  variant_id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  variant_label: string | null;
  image_url: string | null;
  price: string | null;
  currency: string;
  stock: number;
  sellable: boolean;
  /** Set on the exact match when a batch barcode was scanned. */
  batch?: { number: string; expiry: string | null; code: string; expired: boolean };
}

export interface PosLineBatch {
  batch: string;
  expiry: string | null;
  qty: number;
}

export interface PosLine {
  id: string;
  variant_id: string | null;
  product_id: string;
  name: string;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  stock: number | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  refunded_quantity?: number;
  /** Units scanned with a batch barcode -- these exact batches leave the shelf. */
  batches?: PosLineBatch[];
}

export interface PosPaymentPart {
  method: string;
  amount: string;
}

export interface PosRefundRecord {
  number: string;
  created_at: string;
  value: string;
  amount: string;
  coins: string;
  split: Record<string, string>;
  reason: string;
  items: number;
}

export interface PosRefundPreview {
  value: string;
  amount: string;
  coins: string;
  cashback: number;
  final: boolean;
  split: Record<string, string>;
  lines: { line_id: string; quantity: number; value: string }[];
}

export interface PosSale {
  id: string;
  number: string;
  status: "open" | "completed" | "voided" | "refunded";
  items: PosLine[];
  item_count: number;
  total: string;
  currency: string;
  discount: string;
  discount_reason: string;
  coins_redeemed: string;
  amount_due: string;
  coins_earned: number;
  receipt_number: string | null;
  receipt_token: string | null;
  cashier: string | null;
  payments: PosPaymentPart[];
  refunded_value: string;
  refunds: PosRefundRecord[];
  customer: PosCustomer | null;
  payment_method: string | null;
  amount_tendered: string | null;
  change: string | null;
  created_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  store: { name: string; address: string; phone: string | null };
  /** The kassa the sale was rung up at (branch name, or "Onlayn kassa"). */
  kassa?: string;
  shift?: number | null;
}

export interface PosTier {
  name: string;
  slug: string;
  percent: string;
  icon: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "elite" | "legend" | "vip";
  color: string;
}

export interface PosCustomer {
  id: string;
  full_name: string;
  phone_number: string;
  balance: number;
  tier: PosTier | null;
  redeem?: { enabled: boolean; max_coins: number; max_percent: number; min_coins: number };
}

export interface PosSession {
  id: string;
  status: "open" | "closed";
  opened_at: string;
  opened_by: string;
  closed_at: string | null;
  closed_by: string | null;
  duration_minutes: number;
  opening_cash: string;
  opening_note: string;
  counted_cash: string | null;
  cash_difference: string | null;
  closing_note: string;
  sales_count: number;
  items_sold: number;
  gross_sales: string;
  discounts_total: string;
  coins_redeemed: string;
  cash_sales: string;
  uzcard_sales: string;
  humo_sales: string;
  refunds_count: number;
  refunds_total: string;
  cash_refunded: string;
  expected_cash: string;
  /** The shift's running number at this kassa (printed on receipts and the Z-report). */
  number?: number;
}

export interface PosHistoryItem {
  name: string;
  variant_label: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  line_id: string;
  refunded_quantity: number;
}

export interface PosHistoryRow {
  id: string;
  number: string;
  status: "completed" | "refunded";
  receipt_token: string | null;
  total: string;
  discount: string;
  coins_redeemed: string;
  paid: string;
  payments: PosPaymentPart[];
  refunded_value: string;
  partially_refunded: boolean;
  item_count: number;
  items: PosHistoryItem[];
  payment_method: string;
  customer: string | null;
  completed_at: string | null;
  refunded_at: string | null;
}

export interface PosAnalytics {
  period: "today" | "7d" | "30d";
  kpis: {
    revenue: string; sales_count: number; average: string; items_sold: number; cash: string; uzcard: string; humo: string; coins: string; discounts: string;
    refunds_count: number; refunded: string; customers: number;
  };
  series: { label: string; revenue: string; count: number }[];
  peak: { label: string; revenue: string } | null;
  top_products: { variant_id?: string; name?: string; image_url?: string | null; variant_label?: string | null; quantity: number; revenue: string }[];
}

export interface PosStockRow {
  variant_id: string;
  name: string;
  sku: string;
  variant_label: string | null;
  image_url: string | null;
  price: string | null;
  stock: number;
  state: "ok" | "low" | "out";
  stock_value: string | null;
  updated_at: string;
}

export interface PosStock {
  summary: { products: number; units: number; value: string; ok: number; low: number; out: number; low_threshold: number };
  attention: PosStockRow[];
  results: PosStockRow[];
}

export type PaymentCode = "cash" | "uzcard" | "humo" | "card" | "click" | "payme" | "uzum" | "mixed";

/** Someone who may sell at this kassa: the store's owner or a cashier linked to it. */
export interface PosPerson {
  id: string;
  full_name: string;
  phone?: string | null;
  role?: "owner" | "cashier";
  initials?: string;
  color?: string;
}

export interface PosConfig {
  session: PosSession | null;
  store: { id: string; name: string; address: string; phone: string | null };
  kassa: { name: string; has_pin: boolean; locked_seconds: number };
  /** What the signed-in account is at this kassa: the owner sees everything, a cashier only the POS. */
  role: "owner" | "cashier";
  currency: string;
  payment_methods: { code: PaymentCode; live: boolean }[];
  max_discount_percent: string;
  /** Who is selling right now (the signed-in person, or whoever the terminal was handed over to). */
  cashier: PosPerson;
  me: PosPerson | null;
  cashiers: PosPerson[];
  /** A cashier's own pay so far this month: base salary + KPI % of their net sales (null for the owner). */
  earnings?: PosEarnings | null;
}

export interface PosEarnings {
  month: string;
  sales: number;
  revenue: string;
  base_salary: string;
  kpi_percent: string;
  kpi: string;
  total: string;
  paid: string | null;
}

export interface PosError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
