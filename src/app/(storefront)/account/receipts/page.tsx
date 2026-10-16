"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe, ReceiptText, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import { formatDate } from "@/lib/dates";

interface MyReceipt {
  number: string;
  token: string;
  source: "pos" | "online" | "manual";
  kind: "sale" | "refund";
  status: string;
  total: string;
  vat: string;
  payment_method: string;
  issued_at: string;
  order_number: string;
  store: string;
  items: number;
  fiscal: boolean;
  fiscal_url: string;
}

type Filter = "all" | "online" | "pos";

function som(v: string | number): string {
  return Math.round(Number(v) || 0).toLocaleString("ru-RU").replace(/,/g, " ");
}

/** `/account/receipts` -- every official receipt the customer got, each opening the QR e-receipt (`/r/<token>`). */
export default function MyReceiptsPage() {
  const t = useTranslations("account.receiptsPage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [rows, setRows] = useState<MyReceipt[] | null>(null);
  const [error, setError] = useState<"login" | "load" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/receipts")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setError("login");
        const body = await res.json();
        if (!res.ok || !body.success) return setError("load");
        setRows(body.data);
      })
      .catch(() => !cancelled && setError("load"));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "all" || (filter === "pos" ? r.source !== "online" : r.source === "online")), [rows, filter]);
  const spent = useMemo(() => (rows ?? []).reduce((sum, r) => sum + (r.kind === "refund" ? -1 : 1) * Number(r.total), 0), [rows]);

  if (error) {
    return (
      <AccountLayout>
        <ErrorState
          message={error === "login" ? t("login") : t("loadError")}
          action={
            error === "login" ? (
              <Link href="/login?next=/account/receipts" className="nz-cta rounded-full px-5 py-2.5 text-sm font-semibold">
                {t("loginCta")}
              </Link>
            ) : (
              <button type="button" onClick={() => (setError(null), setReloadKey((k) => k + 1))} className="nz-liquid-chip rounded-full px-5 py-2.5 text-sm font-semibold">
                {tc("retry")}
              </button>
            )
          }
        />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[color-mix(in_srgb,var(--nz-info)_22%,transparent)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <span className="nz-cta flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <ReceiptText className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">{t("subtitle")}</p>
            </div>
          </div>
          {rows && rows.length > 0 && (
            <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
              <div className="nz-liquid-chip rounded-2xl px-4 py-2">
                <div className="text-lg font-bold text-ink tabular-nums">{rows.length}</div>
                <div className="text-[11px] text-ink-muted">{t("count")}</div>
              </div>
              <div className="nz-liquid-chip rounded-2xl px-4 py-2">
                <div className="text-lg font-bold text-ink tabular-nums">{som(spent)}</div>
                <div className="text-[11px] text-ink-muted">{t("total")}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {rows === null ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          icon={<ReceiptText className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />}
          action={
            <Link href="/products" className="nz-cta rounded-full px-5 py-2.5 text-sm font-semibold">
              {t("shop")}
            </Link>
          }
        />
      ) : (
        <>
          <div role="tablist" aria-label={t("title")} className="mt-5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {(["all", "online", "pos"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === f ? "nz-cta" : "nz-liquid-chip text-ink-muted"}`}
              >
                {t(`filter.${f}`)}
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {shown.map((r) => {
              const SourceIcon = r.source === "online" ? Globe : Store;
              return (
                <li key={r.token}>
                  <Link
                    href={`/r/${r.token}`}
                    className="nz-glass group flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:gap-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <SourceIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-ink">{r.number}</span>
                        {r.kind === "refund" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">{t("refund")}</span>}
                        {r.fiscal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/14 px-2 py-0.5 text-[11px] font-semibold text-success">
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            {t("fiscal")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {formatDate(r.issued_at, locale, "long")}
                        {" · "}
                        {r.source === "online" ? (r.order_number || t("filter.online")) : r.store || t("filter.pos")}
                        {r.items ? ` · ${t("items", { count: r.items })}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-ink tabular-nums whitespace-nowrap">
                        {r.kind === "refund" ? "−" : ""}
                        {som(r.total)} <span className="text-xs font-medium text-ink-muted">{t("currency")}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && <p className="mt-6 text-center text-sm text-ink-muted">{t("filterEmpty")}</p>}
        </>
      )}
    </AccountLayout>
  );
}
