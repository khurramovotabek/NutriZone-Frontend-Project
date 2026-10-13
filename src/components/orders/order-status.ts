/** Badge tone per order status (see `Badge` in components/ui). */
export const STATUS_TONE: Record<string, "neutral" | "pending" | "success" | "error"> = {
  draft: "neutral",
  pending_payment: "pending",
  confirmed: "success",
  processing: "success",
  shipped: "success",
  delivered: "success",
  completed: "success",
  cancelled: "neutral",
  returned: "neutral",
  failed: "error",
};

/** Customer-facing delivery steps, in order. */
export const ORDER_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

const STEP_FOR_STATUS: Record<string, number> = { draft: 0, pending_payment: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4, completed: 4 };

/** Index into ORDER_STEPS for a status, or null when the order left the happy path (cancelled/failed/returned). */
export function orderStepIndex(status: string): number | null {
  return status in STEP_FOR_STATUS ? STEP_FOR_STATUS[status] : null;
}

/** Statuses where delivery stopped; each has its own banner copy. */
export const STOPPED_STATUSES = ["cancelled", "failed", "returned"] as const;
export type StoppedStatus = (typeof STOPPED_STATUSES)[number];

export function isStopped(status: string): status is StoppedStatus {
  return (STOPPED_STATUSES as readonly string[]).includes(status);
}

/** Filter buckets on the orders list. */
export type OrderFilter = "all" | "active" | "delivered" | "cancelled";

export function orderFilterBucket(status: string): Exclude<OrderFilter, "all"> | null {
  if (status === "pending_payment" || status === "confirmed" || status === "processing" || status === "shipped") return "active";
  if (status === "delivered" || status === "completed") return "delivered";
  if (isStopped(status)) return "cancelled";
  return null;
}
