/** Shapes of /api/my-store/transfers (backend: apps/stores/infrastructure/transfer_read.py + interfaces/api/v1/transfer_views.py). */

export type TransferLocation = { id: string; name: string; kind: "store" | "warehouse"; color: string; city: string; address: string };

export type TransferStatus = "draft" | "ready" | "in_transit" | "receiving" | "partial" | "received" | "completed" | "cancelled";

export type TransferRow = {
  id: string;
  number: string;
  status: TransferStatus;
  status_label: string;
  discrepancy_open: boolean;
  direction: "incoming" | "outgoing";
  source: TransferLocation;
  destination: TransferLocation;
  created_at: string | null;
  dispatched_at: string | null;
  dispatched_by: string;
  received_at: string | null;
  received_by: string;
  lines: number;
  sent: number;
  received: number;
  value: string;
};

export type TransferList = {
  results: TransferRow[];
  counts: { incoming: number; receiving: number; discrepancy: number };
  store: TransferLocation;
};

export type Allocation = { batch: string; expiry: string; qty: number };

export type TransferItem = {
  id: string;
  variant_id: string;
  name: string;
  sku: string;
  barcode: string;
  size: string | null;
  image_url: string | null;
  planned: number;
  picked: number;
  dispatched: number;
  received: number;
  posted: number;
  unit_cost: string;
  cost_source: string;
  batch: string;
  expiry: string;
  allocations: Allocation[];
  reason: string;
  note: string;
  resolution: string;
  resolution_label: string;
  resolved_by: string;
};

export type TransferEvent = { at: string | null; actor: string; action: string; message: string };

export type TransferDetail = {
  id: string;
  number: string;
  status: TransferStatus;
  status_label: string;
  discrepancy_open: boolean;
  direction: "incoming" | "outgoing";
  can_receive: boolean;
  source: TransferLocation;
  destination: TransferLocation;
  notes: string;
  created_by: string;
  created_at: string | null;
  dispatched_by: string;
  dispatched_at: string | null;
  received_by: string;
  received_at: string | null;
  completed_at: string | null;
  updated_at: string;
  summary: { lines: number; planned: number; dispatched: number; received: number; posted: number; shortage: number; excess: number; value: string; batches: number; products: number; differences: number };
  items: TransferItem[];
  events: TransferEvent[];
  reasons: { code: string; label: string }[];
};

export type LookupResult = {
  variant_id: string;
  name: string;
  sku: string;
  barcode: string;
  image_url: string | null;
  batch: string;
  expiry: string | null;
  is_extra_barcode: boolean;
};

export type ApiError = { code: string; message: string; details?: Record<string, unknown> };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };
