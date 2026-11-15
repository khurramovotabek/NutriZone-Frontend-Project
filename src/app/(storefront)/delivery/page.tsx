import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, CheckCircle2, ChevronDown, MapPinned, PackageCheck, PackageOpen, ShoppingBag, Store, Truck, Wallet } from "lucide-react";
import { getLocale } from "next-intl/server";
import { deliveryInfo } from "@/lib/delivery-info";
import { internalTokenHeader } from "@/lib/internal-token";
import { pageMetadata } from "@/lib/seo";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface Zone {
  fee: string;
  carrier: string;
  eta: string;
}
interface Options {
  currency: string;
  zones: { tashkent: Zone; regions: Zone };
  free_from: string | null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = deliveryInfo(await getLocale());
  return pageMetadata({ path: "/delivery", title: t.metaTitle, description: t.metaDescription });
}

/** Live prices/times from the dashboard (Buyurtmalar → Yetkazib berish narxlari); null when the API is down. */
async function loadOptions(locale: string): Promise<Options | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/orders/delivery-options?lang=${encodeURIComponent(locale)}`, {
      headers: internalTokenHeader(),
      next: { revalidate: 300 },
    });
    const body = await res.json();
    return res.ok && body?.success ? (body.data as Options) : null;
  } catch {
    return null;
  }
}

function money(value: string | null | undefined, currency: string): string {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? `${n.toLocaleString("en-US").replace(/,/g, " ")} ${currency === "UZS" ? "so'm" : currency}` : "";
}

const PAY_LOGOS = ["payme", "click", "uzum", "uzcard", "humo"] as const;

/** `/delivery` -- delivery & payment explained in plain words; the banner and the footer link here. */
export default async function DeliveryPage() {
  const locale = await getLocale();
  const t = deliveryInfo(locale);
  const options = await loadOptions(locale);
  const cur = options?.currency ?? "UZS";
  const fill = (s: string) =>
    s
      .replace("{tashkent}", money(options?.zones.tashkent.fee, cur))
      .replace("{regions}", money(options?.zones.regions.fee, cur));

  const cards = [
    { key: "tashkent", icon: Truck, tone: "from-emerald-500/18", zone: options?.zones.tashkent, text: t.zones.tashkent },
    { key: "regions", icon: MapPinned, tone: "from-sky-500/18", zone: options?.zones.regions, text: t.zones.regions },
  ] as const;
  const stepIcons = [ShoppingBag, CheckCircle2, PackageOpen, PackageCheck];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--nz-primary)_92%,black),color-mix(in_srgb,var(--nz-success)_70%,black))] px-5 py-10 text-white sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.eyebrow}
        </p>
        <h1 className="relative mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">{t.lead}</p>
        {options && (
          <div className="relative mt-6 flex flex-wrap gap-2.5">
            {(["tashkent", "regions"] as const).map((z) => (
              <span key={z} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                {t.zones[z].title}: <span className="text-primary">{options.zones[z].eta}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Zones */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map(({ key, icon: Icon, tone, zone, text }) => (
          <article key={key} className={`nz-glass relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} to-transparent p-5 sm:p-6`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
              <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink">{text.title}</h2>
            {zone && <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{fill(text.price)}</p>}
            <dl className="mt-4 space-y-2 text-sm">
              {zone?.eta && (
                <div className="flex justify-between gap-3 rounded-xl bg-surface/70 px-3 py-2">
                  <dt className="text-ink-soft">{t.etaLabel}</dt>
                  <dd className="text-right font-semibold text-primary">{zone.eta}</dd>
                </div>
              )}
              {zone?.carrier && (
                <div className="flex justify-between gap-3 rounded-xl bg-surface/70 px-3 py-2">
                  <dt className="text-ink-soft">{t.carrierLabel}</dt>
                  <dd className="text-right font-semibold text-ink">{zone.carrier}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{text.priceNote}</p>
          </article>
        ))}
        <article className="nz-glass relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/18 to-transparent p-5 sm:p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-amber-600 shadow-sm">
            <Store className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">{t.zones.pickup.title}</h2>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-success">{t.zones.pickup.price}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 rounded-xl bg-surface/70 px-3 py-2">
              <dt className="text-ink-soft">{t.etaLabel}</dt>
              <dd className="text-right font-semibold text-ink">{t.zones.pickup.eta}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            {t.zones.pickup.priceNote}{" "}
            <Link href="/stores" className="font-semibold text-primary hover:underline">
              {t.zones.pickup.link} →
            </Link>
          </p>
        </article>
      </section>

      {options?.free_from && (
        <p className="mt-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          {t.freeFrom.replace("{amount}", money(options.free_from, cur))}
        </p>
      )}

      {/* Steps */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t.stepsTitle}</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => {
            const Icon = stepIcons[i] ?? CheckCircle2;
            return (
              <li key={s.title} className="nz-glass relative rounded-3xl p-5">
                <span className="absolute right-5 top-4 text-3xl font-black text-ink/8 tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.text}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {t.workingDays}
        </p>
      </section>

      {/* Payment */}
      <section className="nz-glass mt-12 rounded-3xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
          {t.paymentTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t.paymentLead}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {PAY_LOGOS.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- static brand marks
            <img key={p} src={`/payments/${p}.svg`} alt={p} className="h-10 w-[66px] rounded-lg shadow-sm" />
          ))}
          <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 text-sm font-medium text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src="/payments/cash.svg" alt="" className="h-7 w-[44px] rounded" />
            {t.paymentCash}
          </span>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t.faqTitle}</h2>
        <div className="mt-4 space-y-3">
          {t.faq.map((f) => (
            <details key={f.q} className="nz-glass group rounded-2xl p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-3xl bg-surface-2/70 p-6 text-center sm:p-10">
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t.ctaTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">{t.ctaText}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5">
            {t.ctaCatalog}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/orders" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
            {t.ctaOrders}
          </Link>
        </div>
      </section>
    </div>
  );
}
