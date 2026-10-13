const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export class AccountApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

async function accountFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export interface NotificationCard {
  id: string;
  notification_type: string;
  priority: string;
  title: string;
  status: string;
  created_at: string;
}

export async function getMyNotifications(accessToken: string): Promise<NotificationCard[]> {
  return accountFetch<NotificationCard[]>("/api/v1/notifications/", accessToken);
}

export interface Participant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  removed_at: string | null;
  is_online: boolean;
}

export interface ConversationStoreSummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  /** Which branch the customer is writing to (location, brand colour, live open state). */
  city?: string;
  district?: string;
  address?: string;
  color?: string;
  is_open_now?: boolean;
}

export interface ConversationLastMessage {
  type: string;
  content: string;
  attachment_type: string | null;
  is_mine: boolean;
  read?: boolean;
  created_at: string | null;
}

export interface Conversation {
  id: string;
  conversation_type: string;
  status: string;
  assigned_operator_id: string | null;
  last_activity_at: string | null;
  other_participant_id: string | null;
  other_participant_is_online: boolean;
  other_participant_full_name: string | null;
  other_participant_avatar_url: string | null;
  store: ConversationStoreSummary | null;
  /** Messages from the other side this viewer hasn't read yet. */
  unread_count?: number;
  last_message?: ConversationLastMessage | null;
}

export interface ConversationDetail extends Conversation {
  participants: Participant[];
  /** Support chats only: working hours, the latest rating and whether the customer may rate the latest closing. */
  support_hours?: { open: boolean; label: string };
  rating?: { score: number; comment: string } | null;
  can_rate?: boolean;
}

export interface CustomerOrderSummary {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total_amount: string | null;
  placed_at: string | null;
  line_count: number;
}

export interface CustomerProfile {
  user_id: string;
  full_name: string | null;
  phone_number: string;
  telegram_username: string | null;
  avatar_url: string | null;
  is_online: boolean;
  orders: CustomerOrderSummary[];
  order_count: number;
}

export type AttachmentType = "image" | "video";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  content: string | null;
  status: string;
  created_at: string | null;
  attachment_type: AttachmentType | null;
  attachment_url: string | null;
  attachment_filename: string | null;
  attachment_size_bytes: number | null;
  reply_to_message_id: string | null;
  /** When the other side read it (read receipts, ✓✓); null until then. Absent on optimistic, not-yet-sent messages. */
  read_at?: string | null;
  /** A product / order card (message_type "card"), resolved by the backend; null when it no longer exists. */
  card?: ChatCard | null;
}

export interface ChatCard {
  kind: "product" | "order";
  id: string;
  title: string;
  /** Storefront path, e.g. /products/whey or /orders/ORD-123. */
  url: string;
  image?: string;
  names?: Record<string, string>;
  price?: string | null;
  currency?: string;
  in_stock?: boolean;
  status?: string;
  status_label?: string;
  total?: string;
  items?: number;
  units?: number;
  date?: string;
  /** Estimated delivery day (dd.mm.yyyy) while the order is on its way. */
  eta?: string | null;
}

export interface AttachmentUpload {
  attachment_type: AttachmentType;
  attachment_url: string;
  attachment_filename: string;
  attachment_size_bytes: number;
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total_pages: number;
  total_count: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination?: PaginationInfo;
}

/**
 * Same shape as `accountFetch`, but also surfaces the real
 * `pagination` envelope `paginated_response()` (backend) always sends
 * alongside `data` -- `accountFetch` itself discards it, which was
 * fine for the single non-paginated `getMyNotifications` call site,
 * but conversations/messages need the real `total_count` (to compute
 * real per-status inbox counts, and to know which page holds the most
 * recent messages) rather than fabricating or guessing one.
 */
async function accountFetchPaginated<T>(path: string, accessToken: string): Promise<PaginatedResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: [] };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return { data: body.data as T[], pagination: body.pagination as PaginationInfo | undefined };
}

export async function getMyConversations(
  accessToken: string,
  opts: { status?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<Conversation>> {
  const params = new URLSearchParams();
  if (opts.status) params.set("filter[status]", opts.status);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return accountFetchPaginated<Conversation>(`/api/v1/chat/conversations${qs ? `?${qs}` : ""}`, accessToken);
}

export async function getConversationDetail(accessToken: string, conversationId: string): Promise<ConversationDetail> {
  return accountFetch<ConversationDetail>(`/api/v1/chat/conversations/${conversationId}`, accessToken);
}

/** Operator-only: the customer's profile (avatar/full name/phone/Telegram) plus their recent orders, for the store-manager's popover. 403s for a customer calling this on their own conversation -- see `CustomerProfileView`'s own docstring. */
export async function getCustomerProfile(accessToken: string, conversationId: string): Promise<CustomerProfile> {
  return accountFetch<CustomerProfile>(`/api/v1/chat/conversations/${conversationId}/customer-profile`, accessToken);
}

export async function getConversationMessages(
  accessToken: string,
  conversationId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<Message>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return accountFetchPaginated<Message>(`/api/v1/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`, accessToken);
}

/**
 * opener_role is deliberately hardcoded to "customer" here, never
 * accepted as a parameter from the caller -- the real backend
 * serializer technically accepts "operator" too, but this frontend
 * must never let a customer-facing action request an elevated role
 * for itself.
 */
export async function openConversation(accessToken: string): Promise<ConversationDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    body: JSON.stringify({ conversation_type: "customer_support", opener_role: "customer" }),
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as ConversationDetail;
}

/** `messageType: "sticker"` sends `content` as a sticker code (see lib/chat-stickers.ts); the backend rejects unknown codes. */
export async function sendMessage(accessToken: string, conversationId: string, content: string, messageType: "text" | "sticker" = "text"): Promise<Message> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    body: JSON.stringify({ message_type: messageType, content }),
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as Message;
}

export async function sendAttachmentMessage(accessToken: string, conversationId: string, attachment: AttachmentUpload): Promise<Message> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    body: JSON.stringify({ message_type: "attachment", ...attachment }),
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as Message;
}

export async function uploadConversationAttachment(accessToken: string, conversationId: string, formData: FormData): Promise<AttachmentUpload> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    body: formData,
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as AttachmentUpload;
}

/** "Choose who to message" -- opens (or resumes) a `customer_sales` conversation seated with this store's real owner. Never a generic "operator", per Store.owner being one unambiguous FK. */
export async function openStoreConversation(accessToken: string, storeId: string): Promise<ConversationDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/store/${storeId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as ConversationDetail;
}

/** Mints a short-lived (60s), single-purpose WebSocket auth ticket -- never the real access token, which stays HttpOnly. */
export async function issueWsTicket(accessToken: string): Promise<{ ticket: string; expires_in: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/identity/auth/ws-ticket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : { data: null };
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AccountApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as { ticket: string; expires_in: number };
}


