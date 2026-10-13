/**
 * Server-only calls to the real NutriZone session-management API
 * (`/api/v1/identity/users/me/sessions`).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface UserSession {
  id: string;
  device_name: string | null;
  device_type: string;
  ip_address: string | null;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface BackendErrorBody {
  success: false;
  error: { code: string; message: string; category: string; details: Record<string, unknown> };
}

export class SessionsApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "SessionsApiError";
  }
}

async function sessionsFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init.headers as Record<string, string>) };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new SessionsApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export async function getSessions(accessToken: string): Promise<UserSession[]> {
  return sessionsFetch<UserSession[]>("/api/v1/identity/users/me/sessions", accessToken);
}

export async function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  await sessionsFetch(`/api/v1/identity/users/me/sessions/${sessionId}`, accessToken, { method: "DELETE" });
}

export async function logoutAllSessions(accessToken: string): Promise<void> {
  await sessionsFetch("/api/v1/identity/auth/logout-all", accessToken, { method: "POST", body: JSON.stringify({}) });
}

export async function updateProfileLanguage(accessToken: string, language: string): Promise<void> {
  await sessionsFetch("/api/v1/identity/users/me", accessToken, { method: "PATCH", body: JSON.stringify({ language }) });
}
