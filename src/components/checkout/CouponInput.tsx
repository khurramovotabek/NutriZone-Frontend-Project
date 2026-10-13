"use client";

import { useState } from "react";
import { LoaderCircle, Tag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AppliedCoupon } from "@/lib/cart-api";
import { Button } from "@/components/ui";

/** Extracted from the old checkout page verbatim (same two endpoints, same behavior) -- reusable without duplicating the apply/remove logic. */
export default function CouponInput({ appliedCoupons, onApplied, onRemoved }: { appliedCoupons: AppliedCoupon[]; onApplied: () => void; onRemoved: () => void }) {
  const t = useTranslations("checkout");
  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    const trimmed = couponCode.trim();
    if (!trimmed || applying) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: trimmed }) });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? t("couponError"));
        return;
      }
      setCouponCode("");
      onApplied();
    } catch {
      setError(t("networkError"));
    } finally {
      setApplying(false);
    }
  }

  async function handleRemove(code: string) {
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/coupon", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: code }) });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? t("couponError"));
        return;
      }
      onRemoved();
    } catch {
      setError(t("networkError"));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      {appliedCoupons.length === 0 ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
            <input
              type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApply())}
              placeholder={t("couponPlaceholder")} disabled={applying} aria-label={t("couponLabel")}
              className="nz-glass-input w-full rounded-lg py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <Button onClick={handleApply} disabled={!couponCode.trim() || applying} variant="secondary" className="shrink-0 px-4 text-sm">
            {applying && <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />}
            {applying ? t("couponApplying") : t("couponApply")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {appliedCoupons.map((c) => (
            <div key={c.code} className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary-soft px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Tag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {t("couponAppliedLabel", { code: c.code })}
              </span>
              <button
                type="button" onClick={() => handleRemove(c.code)} disabled={removing} aria-label={t("couponRemove")}
                className="text-primary transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
              >
                {removing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" /> : <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
