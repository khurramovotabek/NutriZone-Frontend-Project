/**
 * Server-only calls to the real NutriZone Ordering API.
 *
 * Phase 11: the customer-facing payment/order status experience sits
 * entirely on top of the already-verified backend (Order.status,
 * OrderPaymentReference.status embedded directly in the real order
 * payload -- confirmed via direct source inspection, not guessed).
 * No separate "payment status" endpoint call is needed: the order
 * detail response already contains `payment_references[].status`.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface Money {
  amount: string;
  currency: string;
}

export interface OrderLine {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: Money;
  discount_amount: Money;
  tax_amount: Money;
  line_total: Money;
  status: string;
}

export interface PaymentReference {
  id: string;
  payment_id: string;
  amount: Money;
  status: string;
  processed_at: string | null;
}

/** Delivery address as frozen on the order at checkout. */
export interface OrderAddress {
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  phone: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  currency: string;
  status: string;
  lines: OrderLine[];
  payment_references: PaymentReference[];
  placed_at: string | null;
  note: string | null;
  shipping_address?: OrderAddress | null;
  fulfilment_method?: "delivery" | "pickup";
  /** For a pickup order: the branch to collect it from. */
  pickup_store?: { name: string; slug: string; address: string; landmark: string; latitude: number | null; longitude: number | null; phone: string; note: string; is_open_now: boolean; today: string } | null;
}

export class OrdersApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrdersApiError";
  }
}

async function ordersFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new OrdersApiError(response.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Request failed");
  }
  return body.data as T;
}

function decodeUserId(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(json).user_id;
}

export async function getOrders(accessToken: string, page = 1, pageSize = 20): Promise<{ orders: Order[]; totalPages: number; totalCount: number }> {
  const userId = decodeUserId(accessToken);
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/customers/${userId}?page=${page}&page_size=${pageSize}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new OrdersApiError(response.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Request failed");
  }
  return { orders: body.data as Order[], totalPages: body.pagination?.total_pages ?? 1, totalCount: body.pagination?.total_count ?? body.data.length };
}

export async function getOrder(accessToken: string, orderNumber: string): Promise<Order> {
  return ordersFetch<Order>(`/api/v1/orders/${orderNumber}`, accessToken);
}

/* ---------------------------------------------------------------- after-sales (cancel / return) */

export interface AfterSalesItem {
  order_line_item_id: string;
  quantity: number;
}

export interface AfterSales {
  order_number: string;
  status: string;
  /** "now" = cancelled immediately; "request" = the store must approve; null = not possible. */
  can_cancel: "now" | "request" | null;
  cancel_pending: boolean;
  can_return: boolean;
  return_deadline: string | null;
  return_window_expired: boolean;
  lines: { id: string; product_variant_id: string; quantity: number; returnable: number }[];
  returns: { number: string; status: string; reason: string; created_at: string; refund_amount: string | null; items: AfterSalesItem[]; rejection_reason: string }[];
  cancellations: { status: string; reason: string; created_at: string; items: AfterSalesItem[]; rejection_reason: string }[];
  reasons: { cancel: string[]; return: string[] };
}

async function ordersPost<T>(path: string, accessToken: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new OrdersApiError(response.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export async function getAfterSales(accessToken: string, orderNumber: string): Promise<AfterSales> {
  return ordersFetch<AfterSales>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/after-sales`, accessToken);
}

export async function cancelMyOrder(accessToken: string, orderNumber: string, payload: { reason: string; comment: string }): Promise<AfterSales & { outcome: "cancelled" | "requested" }> {
  return ordersPost(`/api/v1/orders/${encodeURIComponent(orderNumber)}/customer-cancel`, accessToken, payload);
}

export async function requestMyReturn(
  accessToken: string,
  orderNumber: string,
  payload: { reason: string; comment: string; lines: AfterSalesItem[] },
): Promise<AfterSales & { return_number: string }> {
  return ordersPost(`/api/v1/orders/${encodeURIComponent(orderNumber)}/customer-return`, accessToken, payload);
}


export interface RunningLowItem {
  product: import("@/lib/api").ProductCard;
  days_left: number;
  runs_out_at: string;
  last_purchased_at: string;
  supply_days: number;
  /** How the run-out date was estimated: their own buying rhythm, the servings on the label, or a 30-day default. */
  basis: "history" | "servings" | "default";
  variant_id: string | null;
}

/** My products predicted to run out within 30 days, soonest first (apps/ordering/infrastructure/replenishment.py). */
export async function getRunningLow(accessToken: string, locale?: string): Promise<RunningLowItem[]> {
  return ordersFetch<RunningLowItem[]>(`/api/v1/orders/replenishment${locale ? `?filter[locale]=${encodeURIComponent(locale)}` : ""}`, accessToken);
}
