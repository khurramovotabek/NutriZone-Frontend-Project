"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";
import { formatLocal, localDigits } from "@/lib/phone";
import { Button, Card } from "@/components/ui";
import SignupNudge from "@/components/checkout/SignupNudge";

type Saved = { order_number: string; total?: string; shipping_amount?: string; name?: string; phone?: string; signed_in?: boolean };

/** After a guest order: the number, what happens next, and the sign-up recommendation (gift / cashback / tracking). */
function SuccessInner() {
  const t = useTranslations("checkout.success");
  const n = useSearchParams().get("n") ?? "";
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`nz-order-${n}`);
      if (raw) setSaved(JSON.parse(raw)); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only storage
    } catch {
      /* number only */
    }
  }, [n]);

  const total = saved?.total ? Number(saved.total) : null;
  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-8">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="h-9 w-9" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t("title")}</h1>
        {n && (
          <p className="mt-2 text-sm text-ink-muted">
            {t("number")}: <b className="font-mono text-base text-ink">{n}</b>
          </p>
        )}
      </div>

      <Card className="mt-6 space-y-3">
        {saved?.phone && (
          <p className="flex items-start gap-2.5 text-sm text-ink">
            <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
            {t("call", { phone: `+998 ${formatLocal(localDigits(saved.phone))}` })}
          </p>
        )}
        {total != null && (
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm text-ink-muted">{t("total")}</span>
            <span className="text-lg font-extrabold tabular-nums text-ink">{formatPrice(total, "UZS")}</span>
          </div>
        )}
        <p className="text-xs text-ink-soft">{t("payCash")}</p>
      </Card>

      <SignupNudge variant="success" className="mt-4" href={saved?.signed_in ? "/login?next=/account/orders&claim=1" : "/login?next=/account/orders"} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {saved?.signed_in && n && (
          <Link href={`/orders/${encodeURIComponent(n)}`} className="flex-1"><Button variant="secondary" className="w-full">{t("myOrder")}</Button></Link>
        )}
        <Link href="/products" className="flex-1"><Button variant="primary" className="w-full">{t("continue")}</Button></Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
