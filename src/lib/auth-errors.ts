/**
 * Maps real backend error codes (confirmed directly against
 * apps/identity/domain/exceptions.py and live requests during
 * reconnaissance) to translation keys under auth.errors.* -- never
 * invents a code the backend doesn't actually return, and never
 * hardcodes an English message here (callers translate the key).
 */
import type { BackendErrorBody } from "./auth-api";

const ERROR_KEYS: Record<string, string> = {
  OTP_EXPIRED: "otpExpired",
  OTP_INVALID: "otpInvalid",
  OTP_MAX_ATTEMPTS_EXCEEDED: "otpMaxAttempts",
  OTP_RESEND_TOO_SOON: "otpResendTooSoon",
  OTP_DELIVERY_FAILED: "otpDeliveryFailed",
  ACCOUNT_BLOCKED: "accountBlocked",
  TOKEN_REUSE_DETECTED: "tokenReuse",
  TOKEN_INVALID: "tokenInvalid",
  SESSION_EXPIRED: "sessionExpired",
  NO_SESSION: "noSession",
  VALIDATION_FAILED: "validationFailed",
  RATE_LIMIT_EXCEEDED: "rateLimited",
};

export function mapAuthErrorCode(code: string): string {
  return ERROR_KEYS[code] ?? "unknown";
}

const FIELD_ERROR_KEYS: Record<string, string> = {
  TELEGRAM_NOT_LINKED: "telegramNotLinked",
};

/**
 * Real, closed gap: RequestTelegramLoginCodeView already returns a
 * precise field-level code (error.details.fields[0].code, e.g.
 * "TELEGRAM_NOT_LINKED") distinguishing "this phone has no linked
 * Telegram account" from a generic validation failure -- confirmed
 * via a real, live request during reconnaissance -- but no frontend
 * code ever read it. Callers should check this before falling back
 * to mapAuthErrorCode's own, less specific top-level error.code.
 */
export function mapFieldErrorCode(body: BackendErrorBody | undefined): string | null {
  const fields = body?.error?.details?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const first = fields[0] as { code?: unknown };
  const fieldCode = typeof first?.code === "string" ? first.code : null;
  if (fieldCode && FIELD_ERROR_KEYS[fieldCode]) {
    return FIELD_ERROR_KEYS[fieldCode];
  }
  return null;
}

export function isRateLimited(status: number): boolean {
  return status === 429;
}
