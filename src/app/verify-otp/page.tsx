"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { mapAuthErrorCode } from "@/lib/auth-errors";
import { safeRedirectPath } from "@/lib/safe-redirect";
import OtpInput, { OTP_LENGTH } from "@/components/OtpInput";
import { useBrand } from "@/components/BrandContext";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyOtpForm() {
  const brand = useBrand();
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const t = useTranslations("otp");
  const tAuth = useTranslations("auth");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!phone) router.replace("/login");
  }, [phone, router]);

  async function verify(submittedCode: string) {
    if (submittedCode.length !== OTP_LENGTH) return;
    setErrorKey(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, code: submittedCode }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setErrorKey(mapAuthErrorCode(body.error?.code ?? "UNKNOWN"));
        setCode("");
        return;
      }
      const next = safeRedirectPath(params.get("next"));
      router.push(next);
      router.refresh();
    } catch {
      setErrorKey("network");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setErrorKey(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setErrorKey(mapAuthErrorCode(body.error?.code ?? "UNKNOWN"));
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setErrorKey("network");
    } finally {
      setResending(false);
    }
  }

  function maskedPhone() {
    if (phone.length < 4) return phone;
    return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-lg font-bold tracking-tight text-primary">{brand.name}</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("subtitle", { phone: maskedPhone() })}</p>

      <div className="mt-8">
        <OtpInput
          value={code}
          disabled={loading}
          onChange={(v) => {
            setCode(v);
            if (v.length === OTP_LENGTH) verify(v);
          }}
        />
      </div>

      {errorKey && (
        <p role="alert" aria-live="polite" className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
          {errorKey === "network" ? tAuth("networkError") : tAuth(`errors.${errorKey}` as "errors.unknown")}
        </p>
      )}

      {loading && (
        <p aria-live="polite" className="mt-4 text-center text-sm text-ink-muted">
          {t("verifying")}
        </p>
      )}

      <div className="mt-6 text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-ink-muted">{t("resendIn", { seconds: cooldown })}</span>
        ) : (
          <button onClick={handleResend} disabled={resending} className="font-medium text-primary transition-colors hover:brightness-110 disabled:opacity-50">
            {resending ? t("resending") : t("resend")}
          </button>
        )}
      </div>
    </div>
  );
}

function VerifyOtpFallback() {
  const t = useTranslations("common");
  return <div className="mx-auto max-w-md px-4 py-10 text-center text-ink-muted">{t("loading")}</div>;
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpFallback />}>
      <VerifyOtpForm />
    </Suspense>
  );
}
