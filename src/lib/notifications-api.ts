/** Customer inbox (backend: /api/v1/notifications/inbox*). Server-side only -- called from the /api/notifications route handlers. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type InboxTone = "success" | "info" | "warning" | "danger" | "primary" | "violet" | "neutral";

export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  icon: string;
  tone: InboxTone;
  priority: string;
  read: boolean;
  created_at: string;
}

export interface InboxPage {
  items: InboxItem[];
  unread: number;
  total: number;
  has_more: boolean;
  page: number;
}

export async function inboxFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/v1/notifications/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}
