"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, BadgeCheck, Camera, ExternalLink, Loader2, MapPin, Star, Store as StoreIcon } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { useStoreDashboard } from "./StoreDashboardContext";
import StoreDashboardNav from "./StoreDashboardNav";

/**
 * Real, closed gap: this previously listed a content-style lifecycle
 * (draft/pending_review/published/unpublished/archived) that matches
 * no value `Store.status` (apps/stores/infrastructure/models.py::StoreStatus)
 * ever actually returns -- confirmed directly against the real
 * `GET /my-store` response (`status: "active"`). Every real store
 * therefore hit the `?? "neutral"` fallback tone AND a missing
 * `myStore.status.*` translation key. Now matches the real enum
 * exactly: active/inactive/temporarily_closed/coming_soon.
 */
const STATUS_TONE: Record<string, "neutral" | "pending" | "success" | "error"> = {
  active: "success",
  inactive: "neutral",
  temporarily_closed: "pending",
  coming_soon: "pending",
};

const CASHIER_PAGES = ["/profile/store/pos", "/profile/store/orders", "/profile/store/receiving", "/profile/store/receipts"];

export default function StoreDashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("myStore");
  const { store, setStore, loading, error, saveState } = useStoreDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const cashier = store?.my_role === "cashier";

  // A cashier's store is the kassa: every owner-only page sends them to the POS terminal (same pages as the nav's `cashier: true`).
  useEffect(() => {
    if (cashier && !CASHIER_PAGES.some((p) => pathname.startsWith(p))) router.replace("/profile/store/pos");
  }, [cashier, pathname, router]);

  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const res = await fetch("/api/my-store/logo", { method: "POST", body: formData });
      const body = await res.json();
      if (res.ok && body.success && store) setStore({ ...store, logo_url: body.data.logo_url });
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.set("cover_image", file);
      const res = await fetch("/api/my-store/cover-image", { method: "POST", body: formData });
      const body = await res.json();
      if (res.ok && body.success && store) setStore({ ...store, cover_image_url: body.data.cover_image_url });
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="h-48 w-full rounded-2xl sm:h-56" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        {error === "notFound" ? (
          <EmptyState
            icon={<StoreIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />}
            title={t("noStoreTitle")}
            description={t("noStoreBody")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/contact" className="nz-cta nz-shimmer-btn rounded-full px-5 py-2.5 text-sm font-semibold">
                  {t("noStoreCta")}
                </Link>
                <Link href="/stores" className="nz-liquid-chip rounded-full px-5 py-2.5 text-sm font-semibold">
                  {t("noStoreBrowse")}
                </Link>
              </div>
            }
          />
        ) : (
          <ErrorState
            message={error === "login" ? t("loginRequired") : t("loadError")}
            action={
              error === "login" && (
                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="nz-cta rounded-full px-5 py-2.5 text-sm font-semibold">
                  {t("loginRequired")}
                </Link>
              )
            }
          />
        )}
      </div>
    );
  }

  const publicUrl = store.slug ? `/store/${store.slug}` : null;
  const place = [store.district, store.city].filter(Boolean).join(", ");
  // the big cover belongs to the overview; every other page gets a slim header and more room for its own work
  const compact = pathname !== "/profile/store";
  // the till needs the whole width: on the POS page the section nav moves above the content
  const wide = pathname.startsWith("/profile/store/pos");
  const today = store.today_hours;
  const openChip = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${store.is_open_now ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/15 text-ink-soft"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${store.is_open_now ? "bg-emerald-500" : "bg-slate-400"}`} />
      {store.is_open_now ? t("openNow") : t("closedNow")}
      {today && !today.closed && today.open ? ` · ${today.open}–${today.close}` : ""}
    </span>
  );

  return (
    <div className="pb-16">
      <div className={`mx-auto px-4 pt-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("back")}
        </Link>

        {compact ? (
          <section className="nz-glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
              <MediaImage src={store.logo_url} alt="" fit="contain" padding="p-1" fallbackIcon={<StoreIcon className="h-5 w-5 text-slate-400" strokeWidth={1.5} aria-hidden="true" />} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-ink">{store.name || t("manageStore")}</h1>
                <Badge tone={STATUS_TONE[store.status] ?? "neutral"}>{t(`status.${store.status}` as "status.active")}</Badge>
                {openChip}
              </div>
              {place && <p className="truncate text-xs text-ink-soft">{place}</p>}
            </div>
            {saveState !== "idle" && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${saveState === "error" ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`} role="status" aria-live="polite">
                {saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : t("saveError")}
              </span>
            )}
            {publicUrl && (
              // icon-only on phones so the store name keeps the row instead of truncating to "Mobil Test ..."
              <Link href={publicUrl} target="_blank" aria-label={t("viewOnSite")} title={t("viewOnSite")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-semibold text-ink hover:text-primary sm:h-auto sm:w-auto sm:px-3 sm:py-1.5">
                <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden="true" /> <span className="hidden sm:inline">{t("viewOnSite")}</span>
              </Link>
            )}
          </section>
        ) : (
        /* Cover + identity, contained in one glass card */
        <section className="nz-glass relative overflow-hidden rounded-3xl">
          <div className="relative h-40 w-full sm:h-52">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.45),transparent_45%),radial-gradient(circle_at_85%_30%,rgba(99,102,241,0.45),transparent_45%),linear-gradient(135deg,#0f172a,#111827)]" />
            {store.cover_image_url && <MediaImage src={store.cover_image_url} alt="" fit="cover" loading="eager" fallbackIcon={null} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            {!cashier && (<button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/60"
            >
              {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" strokeWidth={1.9} />}
              {t("changeCover")}
            </button>)}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          <div className="relative flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-6">
            <div className="group relative -mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--color-bg)] bg-white shadow-xl sm:-mt-14 sm:h-28 sm:w-28">
              <MediaImage src={store.logo_url} alt="" fit="contain" padding="p-2" fallbackIcon={<StoreIcon className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden="true" />} />
              {!cashier && (<button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                aria-label={t("changeLogo")}
                className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                {logoUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" strokeWidth={1.9} />}
              </button>)}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="min-w-0 flex-1 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-ink sm:text-3xl">{store.name || t("manageStore")}</h1>
                <Badge tone={STATUS_TONE[store.status] ?? "neutral"}>{t(`status.${store.status}` as "status.active")}</Badge>
                {openChip}
                {cashier && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-bold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                    {t("youAreCashier")}
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                {store.rating_count !== undefined && store.rating_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
                    <b className="text-ink">{store.rating_average?.toFixed(1)}</b> · {t("ratingCount", { count: store.rating_count })}
                  </span>
                )}
                {place && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                    {place}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saveState !== "idle" && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${saveState === "error" ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`} role="status" aria-live="polite">
                  {saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : t("saveError")}
                </span>
              )}
              {publicUrl && (
                <>
                  <ShareButton title={store.name} url={publicUrl} />
                  <Link href={publicUrl} target="_blank" className="nz-cta inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-md">
                    <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("viewOnSite")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
        )}

        <div className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 ${wide ? "" : "lg:grid-cols-[230px_1fr]"}`}>
          <aside className={`min-w-0 ${wide ? "" : "lg:sticky lg:top-6 lg:h-fit"}`}>
            <StoreDashboardNav horizontal={wide} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
