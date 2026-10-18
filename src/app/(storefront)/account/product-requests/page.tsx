"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, ImagePlus, Loader2, MessageCircle, PackageSearch, Search, SearchX, Send, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import AccountLayout from "@/components/AccountLayout";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/media";

type Status = "new" | "searching" | "found" | "not_found" | "cancelled";

interface ProductRequest {
  id: string;
  number: string;
  product_name: string;
  brand: string;
  description: string;
  url: string;
  quantity: number;
  status: Status;
  image_url: string | null;
  staff_reply: string;
  offered_price: string | null;
  offered_product: { id: string; name: string; slug: string } | null;
  created_at: string;
  answered_at: string | null;
  can_cancel: boolean;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const STATUS_STYLE: Record<Status, { cls: string; icon: typeof Search }> = {
  new: { cls: "bg-primary-soft text-primary", icon: Send },
  searching: { cls: "bg-warning/15 text-warning", icon: Search },
  found: { cls: "bg-success/15 text-success", icon: CheckCircle2 },
  not_found: { cls: "bg-surface-2 text-ink-muted", icon: SearchX },
  cancelled: { cls: "bg-surface-2 text-ink-soft", icon: XCircle },
};
const STEPS: Status[] = ["new", "searching", "found"];

function som(v: string | number): string {
  return Math.round(Number(v) || 0).toLocaleString("ru-RU").replace(/,/g, " ");
}

/** `/account/product-requests` -- "find this product for me": the customer describes a product the shop doesn't sell; staff answer. */
export default function ProductRequestsPage() {
  const t = useTranslations("account.productRequestsPage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const uid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProductRequest[] | null>(null);
  const [error, setError] = useState<"login" | "load" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/product-requests")
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

  function pickImage(file: File | undefined) {
    setFormError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setFormError(t("errors.IMAGE_TYPE"));
    if (file.size > MAX_IMAGE_BYTES) return setFormError(t("errors.IMAGE_TOO_LARGE"));
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (String(data.get("product_name") || "").trim().length < 2) return setFormError(t("errors.NAME_REQUIRED"));
    data.delete("image");
    if (image) data.set("image", image);
    setSending(true);
    setFormError(null);
    setSent(null);
    try {
      const res = await fetch("/api/account/product-requests", { method: "POST", body: data });
      if (res.status === 401) return setError("login");
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const code = body?.error?.code as string | undefined;
        return setFormError(code && t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic"));
      }
      setRows((prev) => [body.data as ProductRequest, ...(prev ?? [])]);
      setSent((body.data as ProductRequest).number);
      form.reset();
      clearImage();
    } catch {
      setFormError(t("errors.generic"));
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    setCancelling(id);
    try {
      const res = await fetch(`/api/account/product-requests/${id}/cancel`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) setRows((prev) => (prev ?? []).map((r) => (r.id === id ? (body.data as ProductRequest) : r)));
    } finally {
      setCancelling(null);
    }
  }

  if (error) {
    return (
      <AccountLayout>
        <ErrorState
          message={error === "login" ? t("login") : t("loadError")}
          action={
            error === "login" ? (
              <Link href="/login?next=/account/product-requests" className="nz-cta rounded-full px-5 py-2.5 text-sm font-semibold">
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

  const input = "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";
  const open = (rows ?? []).filter((r) => r.status === "new" || r.status === "searching").length;

  return (
    <AccountLayout>
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[color-mix(in_srgb,var(--nz-violet,#7c3aed)_22%,transparent)]" />
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <span className="nz-cta flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <PackageSearch className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
              <p className="mt-0.5 max-w-xl text-sm text-ink-muted">{t("subtitle")}</p>
            </div>
          </div>
          {rows && rows.length > 0 && (
            <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
              <div className="nz-liquid-chip rounded-2xl px-4 py-2">
                <div className="text-lg font-bold text-ink tabular-nums">{open}</div>
                <div className="text-[11px] text-ink-muted">{t("openCount")}</div>
              </div>
              <div className="nz-liquid-chip rounded-2xl px-4 py-2">
                <div className="text-lg font-bold text-ink tabular-nums">{rows.filter((r) => r.status === "found").length}</div>
                <div className="text-[11px] text-ink-muted">{t("foundCount")}</div>
              </div>
            </div>
          )}
        </div>
        <ol className="relative grid gap-2 border-t border-border px-5 py-4 text-xs text-ink-muted sm:grid-cols-3 sm:px-7">
          {(["how1", "how2", "how3"] as const).map((k, i) => (
            <li key={k} className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{i + 1}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
      </section>

      <form onSubmit={submit} className="nz-glass nz-rise mt-5 rounded-3xl p-5 sm:p-7" noValidate aria-labelledby={`${uid}-form`}>
        <h2 id={`${uid}-form`} className="text-lg font-semibold text-ink">{t("formTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
          <div className="grid min-w-0 gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                <span>
                  {t("name")} <span className="text-danger">*</span>
                </span>
                <input name="product_name" required maxLength={200} placeholder={t("namePlaceholder")} className={input} autoComplete="off" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                {t("brand")}
                <input name="brand" maxLength={120} placeholder={t("brandPlaceholder")} className={input} autoComplete="off" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                {t("url")}
                <input name="url" type="url" inputMode="url" maxLength={500} placeholder="https://…" className={input} autoComplete="off" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                {t("quantity")}
                <input name="quantity" type="number" min={1} max={999} defaultValue={1} className={input} />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              {t("description")}
              <textarea name="description" rows={3} maxLength={2000} placeholder={t("descriptionPlaceholder")} className={`${input} resize-y`} />
            </label>
          </div>

          <div className="grid content-start gap-1.5 text-sm font-medium text-ink">
            <span>{t("image")}</span>
            {preview ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-surface-2 sm:aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={preview} alt={t("imagePreview")} className="h-full w-full object-contain" />
                <button type="button" onClick={clearImage} aria-label={t("removeImage")} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickImage(e.dataTransfer.files?.[0]);
                }}
                className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-2/60 p-4 text-center text-xs text-ink-muted transition hover:border-primary hover:text-primary sm:aspect-square"
              >
                <ImagePlus className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
                <span className="font-semibold">{t("imagePick")}</span>
                <span>{t("imageHint")}</span>
              </button>
            )}
            <input ref={fileRef} type="file" name="image" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => pickImage(e.target.files?.[0])} />
          </div>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}
        {sent && (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-success/12 px-4 py-2.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("sent", { number: sent })}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-soft">{t("privacyNote")}</p>
          <button type="submit" disabled={sending} className="nz-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {sending ? t("sending") : t("submit")}
          </button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-ink">{t("listTitle")}</h2>
      {rows === null ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} icon={<PackageSearch className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />} />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const style = STATUS_STYLE[r.status];
            const Icon = style.icon;
            const img = resolveImageUrl(r.image_url);
            const step = STEPS.indexOf(r.status);
            return (
              <li key={r.id} className="nz-glass rounded-2xl p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-20 sm:w-20">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element -- customer upload served by the API host
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-soft">
                        <PackageSearch className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink [overflow-wrap:anywhere]">
                          {r.product_name}
                          {r.brand && <span className="font-normal text-ink-muted"> · {r.brand}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {r.number} · {formatDate(r.created_at, locale, "long")} · {t("pieces", { count: r.quantity })}
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.cls}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(`status.${r.status}`)}
                      </span>
                    </div>
                    {r.description && <p className="mt-2 line-clamp-3 text-sm text-ink-muted [overflow-wrap:anywhere]">{r.description}</p>}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{r.url.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                    {step >= 0 && (
                      <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                        {STEPS.map((s, i) => (
                          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface-2"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(r.staff_reply || r.offered_product || r.offered_price) && (
                  <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-3.5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("replyTitle")}</p>
                    {r.staff_reply && <p className="mt-1 whitespace-pre-line text-ink [overflow-wrap:anywhere]">{r.staff_reply}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {r.offered_price && (
                        <span className="font-semibold text-ink">
                          {t("price")}: {som(r.offered_price)} {t("currency")}
                        </span>
                      )}
                      {r.offered_product && (
                        <Link href={`/products/${r.offered_product.slug}`} className="nz-cta inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold">
                          {t("openProduct")}
                        </Link>
                      )}
                      {r.status === "found" && !r.offered_product && (
                        <Link href="/account/chat" className="nz-cta inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold">
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("orderViaChat")}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {r.can_cancel && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => cancel(r.id)}
                      disabled={cancelling === r.id}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-60"
                    >
                      {cancelling === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                      {t("cancel")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AccountLayout>
  );
}
