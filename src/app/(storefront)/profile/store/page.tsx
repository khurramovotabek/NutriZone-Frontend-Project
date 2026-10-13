"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ImageIcon, MapPin, MessageCircle, MonitorSmartphone, Package, PackageCheck, ShoppingBag, Sparkles, Star, Store as StoreIcon, Truck } from "lucide-react";
import { Card } from "@/components/ui";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import { useStoreOrders } from "@/components/store-dashboard/useStoreOrders";
import { computeCompleteness, computeStockBreakdown, computeWeeklyHours, countOpenDays } from "@/components/store-dashboard/insights";
import { BarList, DonutChart, StatCard } from "@/components/charts/Charts";

function som(n: string | number): string {
  return Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

/**
 * The branch at a glance: online orders waiting (new / ready / done today), what needs attention (an order to accept,
 * a missing map point, pickup switched off, an unfinished profile), the latest orders and the store-health charts.
 */
export default function StoreOverviewPage() {
  const t = useTranslations("myStore");
  const { store } = useStoreDashboard();
  const { data } = useStoreOrders("active");
  if (!store) return null;

  const completeness = computeCompleteness(store);
  const stock = computeStockBreakdown(store);
  const weeklyHours = computeWeeklyHours(store);
  const openDays = countOpenDays(store);
  const counts = data?.counts ?? { active: 0, new: 0, ready: 0, done: 0 };

  const attention: { tone: "danger" | "warning" | "info"; text: string; href: string; icon: React.ReactNode }[] = [];
  if (counts.new) attention.push({ tone: "danger", text: t("attention.newOrders", { count: counts.new }), href: "/profile/store/orders", icon: <ShoppingBag className="h-4 w-4" aria-hidden="true" /> });
  if (counts.ready) attention.push({ tone: "info", text: t("attention.readyOrders", { count: counts.ready }), href: "/profile/store/orders", icon: <PackageCheck className="h-4 w-4" aria-hidden="true" /> });
  if (store.latitude == null) attention.push({ tone: "warning", text: t("attention.noPoint"), href: "/profile/store/contact", icon: <MapPin className="h-4 w-4" aria-hidden="true" /> });
  if (store.pickup_enabled === false) attention.push({ tone: "info", text: t("attention.pickupOff"), href: "/profile/store/profile", icon: <StoreIcon className="h-4 w-4" aria-hidden="true" /> });
  if (!openDays) attention.push({ tone: "warning", text: t("attention.noHours"), href: "/profile/store/hours", icon: <Clock className="h-4 w-4" aria-hidden="true" /> });
  if (completeness.percent < 100) attention.push({ tone: "info", text: t("attention.profile", { percent: completeness.percent }), href: "/profile/store/profile", icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> });
  const toneClass = { danger: "bg-rose-500/12 text-rose-600 dark:text-rose-400", warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400", info: "bg-sky-500/12 text-sky-600 dark:text-sky-400" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/profile/store/orders"><StatCard icon={<ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("kpiActiveOrders")} value={String(counts.active)} hint={counts.new ? t("kpiNewHint", { count: counts.new }) : t("kpiNoNew")} tone={counts.new ? "danger" : "primary"} /></Link>
        <StatCard icon={<PackageCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("kpiDoneToday")} value={String(data?.today.done ?? 0)} hint={`${som(data?.today.revenue ?? 0)} ${t("orders.sum")}`} tone="info" />
        <StatCard icon={<Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("kpiProducts")} value={String(store.products.length)} hint={stock.outOfStock ? t("kpiOutHint", { count: stock.outOfStock }) : undefined} />
        <StatCard icon={<Star className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} label={t("kpiRating")} value={store.rating_count ? (store.rating_average ?? 0).toFixed(1) : "—"}
          hint={store.rating_count ? t("ratingCount", { count: store.rating_count }) : t("noRatingsYet")} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" /> {t("recentOrders")}</h2>
            <Link href="/profile/store/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">{t("allOrders")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
          {data && data.orders.length ? (
            <ul className="divide-y divide-border/70">
              {data.orders.slice(0, 5).map((o) => (
                <li key={o.number}>
                  <Link href={`/profile/store/orders?o=${o.number}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${o.method === "pickup" ? "bg-orange-500/15 text-orange-500" : "bg-primary-soft text-primary"}`}>
                      {o.method === "pickup" ? <StoreIcon className="h-4 w-4" aria-hidden="true" /> : <Truck className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold text-ink">{o.number}</span>
                      <span className="block truncate text-xs text-ink-soft">{o.customer.name} · {t("orders.units", { count: o.units })}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold text-ink">{som(o.total)}</span>
                      <span className={`block text-xs font-semibold ${o.status === "pending_payment" ? "text-rose-500" : "text-ink-soft"}`}>{o.status_label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">{t("orders.emptyActive")}</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink"><AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" /> {t("attention.title")}</h2>
          {attention.length ? (
            <ul className="space-y-2">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ${toneClass[a.tone]}`}>
                    {a.icon}<span className="flex-1">{a.text}</span><ArrowRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-500/12 px-3 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t("attention.allGood")}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">{t("chartCompleteness")}</h2>
          </div>
          <DonutChart centerValue={`${completeness.percent}%`} centerLabel={t("chartCompletenessCenter")}
            segments={[{ label: t("chartFilled"), value: completeness.filled, color: "var(--nz-primary)" }, { label: t("chartMissing"), value: completeness.total - completeness.filled, color: "var(--nz-border)" }]} />
          {completeness.percent < 100 && (
            <p className="mt-4 text-xs text-ink-muted">{t("completenessHint")} {completeness.missingKeys.map((k) => t(`missingField.${k}` as "missingField.logo")).join(", ")}</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">{t("chartStock")}</h2>
          </div>
          {stock.total === 0 ? (
            <p className="text-sm text-ink-muted">{t("noProductsYet")}</p>
          ) : (
            <DonutChart centerValue={String(stock.total)} centerLabel={t("kpiProducts")}
              segments={[{ label: t("stockHealthy"), value: stock.healthy, color: "var(--nz-success)" }, { label: t("stockLow"), value: stock.low, color: "var(--nz-warning)" }, { label: t("stockOut"), value: stock.outOfStock, color: "var(--nz-danger)" }]} />
          )}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">{t("chartHours")}</h2>
            </div>
            <Link href="/profile/store/hours" className="text-sm text-primary transition-colors hover:brightness-110">{t("editHours")}</Link>
          </div>
          <BarList max={14} items={weeklyHours.map((d) => ({ label: t(d.code), value: d.hours, displayValue: d.closed ? t("closed") : `${d.hours.toFixed(1)} ${t("hoursUnit")}`, color: d.closed ? "var(--nz-border)" : "var(--nz-primary)" }))} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/profile/store/pos", icon: MonitorSmartphone, label: t("navPos") },
          { href: "/profile/store/inquiries", icon: MessageCircle, label: t("navInquiries") },
          { href: "/profile/store/contact", icon: MapPin, label: t("navContact") },
          { href: "/profile/store/gallery", icon: ImageIcon, label: t("navGallery") },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <Card className="nz-glass-interactive flex items-center gap-2.5 p-4">
              <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-sm font-medium text-ink">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
