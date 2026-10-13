/**
 * Online payments (Payme / Click / Uzum, Uzcard & Humo through one of them, cash on delivery).
 * Methods come from the backend's dashboard-managed config; unavailable ones are "coming_soon".
 * Server-side calls only (Route Handlers); the browser talks to /api/payments/*.
 */
import { API_BASE_URL } from "@/lib/api";

export type PaymentMethodKey = "cash" | "payme" | "click" | "uzum" | "uzcard" | "humo";

export interface PaymentMethod {
  key: PaymentMethodKey;
  name: string;
  color: string;
  online: boolean;
  available: boolean;
  status: "active" | "coming_soon";
  test_mode: boolean;
  min_amount: string | null;
  max_amount: string | null;
  /** uzcard / humo: the acquirer whose page takes the card. */
  via: PaymentMethodKey | null;
}

export interface OrderPaymentState {
  order_number: string;
  paid: boolean;
  amount: string;
  can_pay_online: boolean;
  latest: { status: "created" | "pending" | "succeeded" | "failed" | "cancelled" | "refunded"; method: string; provider: string; paid_at: string | null } | null;
}

export class PaymentsApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new PaymentsApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Request failed");
  return body.data as T;
}

export const getPaymentMethods = () => call<PaymentMethod[]>("/api/v1/payments/methods");
export const getOrderPayment = (accessToken: string, orderNumber: string) => call<OrderPaymentState>(`/api/v1/payments/orders/${encodeURIComponent(orderNumber)}`, {}, accessToken);
export const startOrderPayment = (accessToken: string, orderNumber: string, method: PaymentMethodKey, lang: string) =>
  call<{ checkout_url: string; payment_id: string; provider: string; method: string }>(
    `/api/v1/payments/orders/${encodeURIComponent(orderNumber)}/pay`, { method: "POST", body: JSON.stringify({ method, lang }) }, accessToken,
  );
