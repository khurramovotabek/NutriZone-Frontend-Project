/**
 * Server-only calls to the real NutriZone Identity API. This module
 * must never be imported from a Client Component -- it exists so
 * tokens are exchanged entirely server-side, never touching browser
 * JS (see src/lib/session.ts for the HttpOnly cookie bridge this
 * enables). Enforced structurally (only ever imported from
 * src/app/api/auth/* Route Handlers) rather than via the `server-only`
 * package, since adding that dependency for this alone would be
 * unnecessary per this phase's own explicit dependency policy.
 *
 * Every field/endpoint here was confirmed directly against the real
 * backend before being typed -- see the Phase 09.1 report's
 * Authentication Capability Matrix for the exact verification
 * evidence (a real request-otp -> verify-otp -> refresh ->
 * TOKEN_REUSE_DETECTED chain was executed against the actual Django
 * views).
 */
import { forwardedForHeader } from "@/lib/client-ip";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  session_id: string;
  is_new_user: boolean;
}

export interface BackendErrorBody {
  success: false;
  error: { code: string; message: string; category: string; details: Record<string, unknown> };
}

export class AuthApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function authFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // the shopper's IP, so the backend's per-IP auth limits apply per customer, not to our server as a whole
    headers: { "Content-Type": "application/json", ...(await forwardedForHeader()), ...init.headers },
    cache: "no-store", // auth endpoints must never be cached
  });

  const body = await response.json();

  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new AuthApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }

  return body.data as T;
}

export async function requestOtp(phoneNumber: string): Promise<{ message: string }> {
  return authFetch("/api/v1/identity/auth/request-otp", { method: "POST", body: JSON.stringify({ phone_number: phoneNumber }) });
}

export async function requestTelegramCode(phoneNumber: string): Promise<{ message: string }> {
  return authFetch("/api/v1/identity/auth/request-telegram-code", { method: "POST", body: JSON.stringify({ phone_number: phoneNumber }) });
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<TokenPair> {
  return authFetch("/api/v1/identity/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone_number: phoneNumber, code }) });
}

export async function verifyCodeOnly(code: string): Promise<TokenPair> {
  /**
   * Real, product-required login path: the website's login page
   * never collects a phone number -- the user gets their 6-digit
   * code from the Telegram bot's own "Get login code" button, and
   * types only the code here. Calls the real backend endpoint
   * (/auth/verify-code) added specifically for this flow.
   */
  return authFetch("/api/v1/identity/auth/verify-code", { method: "POST", body: JSON.stringify({ code }) });
}

export interface TelegramAuthSessionCreated {
  session_id: string;
  telegram_url: string | null;
  expires_in: number;
}

export async function createTelegramAuthSession(): Promise<TelegramAuthSessionCreated> {
  return authFetch("/api/v1/identity/auth/telegram/session", { method: "POST", body: "{}" });
}

export type TelegramAuthSessionStatusValue = "pending" | "verified" | "expired" | "consumed" | "failed";

export interface TelegramAuthSessionStatusResult {
  status: TelegramAuthSessionStatusValue;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
}

/** Telegram Mini App sign-in: the WebApp initData (verified by the backend) -> a ready bot-initiated auth session. */
export async function startTelegramWebAppSession(initData: string): Promise<{ session_id: string; cart?: { code: string; token: string } | null }> {
  return authFetch("/api/v1/telegram/webapp/session", { method: "POST", body: JSON.stringify({ init_data: initData }) });
}

export async function getTelegramAuthSessionStatus(sessionId: string): Promise<TelegramAuthSessionStatusResult> {
  return authFetch(`/api/v1/identity/auth/telegram/session/${sessionId}`, { method: "GET" });
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  return authFetch("/api/v1/identity/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
}

export async function logout(accessToken: string, refreshToken: string | null): Promise<void> {
  await authFetch("/api/v1/identity/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
  });
}

export interface UserProfile {
  id: string;
  phone_number: string;
  email: string | null;
  telegram_username: string | null;
  full_name: string;
  username: string | null;
  language: string;
  status: string;
  avatar_url: string | null;
}

export async function getMe(accessToken: string): Promise<UserProfile> {
  return authFetch("/api/v1/identity/users/me", { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
}
