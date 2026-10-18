"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, LifeBuoy, PieChart, Package, PackageSearch, ShoppingBag, TrendingUp, Truck, UserRoundPen, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import FitMoney from "@/components/FitMoney";
import LoyaltyOverviewCard from "@/components/loyalty/LoyaltyOverviewCard";
import ProgressRing from "@/components/loyalty/ProgressRing";
import { DonutChart, TrendLine, chartColor } from "@/components/charts/Charts";
import ActiveOrderCard from "@/components/account-dashboard/ActiveOrderCard";
import RunningLowCard from "@/components/account-dashboard/RunningLowCard";
import DailyPlanCard from "@/components/account-dashboard/DailyPlanCard";
import DashboardHero from "@/components/account-dashboard/DashboardHero";
import RecentOrders from "@/components/account-dashboard/RecentOrders";
import { ACTIVE_STATUSES, computeMonthlySpend, computeSpendSummary, formatMoney, ordersByStatus } from "@/lib/account-insights";

interface Profile {
  full_name: string;
  username: string | null;
  email: string | null;
  bio: string | null;
  birthday: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
}

/** Same fields the profile page's completeness ring counts. */
const PROFILE_FIELDS = ["avatar_url", "full_name", "username", "email", "birthday", "height_cm", "weight_kg", "goal", "bio"] as const;

function profileCompleteness(p: Profile): number {
  const filled = PROFILE_FIELDS.filter((k) => {
    const v = p[k];
    return typeof v === "string" ? v.trim() !== "" : v !== null && v !== undefined;
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/** Donut colour per order status, so "delivered" never looks like "shipped". */
const STATUS_COLORS: Record<string, string> = {
  draft: "var(--nz-text-soft)",
  pending_payment: "var(--nz-warning)",
  confirmed: "#8b5cf6",
  processing: "#6366f1",
  shipped: "var(--nz-info)",
  delivered: "var(--nz-success)",
  completed: "#0d9488",
  cancelled: "var(--nz-text-soft)",
  returned: "#f97316",
  failed: "var(--nz-danger)",
};

type Tone = "primary" | "success" | "info" | "warning";
const TONES: Record<Tone, { tile: string; glow: string }> = {
  primary: { tile: "bg-primary-soft text-primary", glow: "rgba(var(--nz-primary-rgb),0.22)" },
  success: { tile: "bg-success/14 text-success", glow: "color-mix(in srgb, var(--nz-success) 22%, transparent)" },
  info: { tile: "bg-info/14 text-info", glow: "color-mix(in srgb, var(--nz-info) 22%, transparent)" },
  warning: { tile: "bg-warning/14 text-warning", glow: "color-mix(in srgb, var(--nz-warning) 24%, transparent)" },
};

export default function AccountDashboardPage() {
  const t = useTranslations("account.dashboardPage");
  const tOrders = useTranslations("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/profile").then((r) => r.json()), fetch("/api/orders").then((r) => r.json())])
      .then(([profileBody, ordersBody]) => {
        if (!profileBody.success || !ordersBody.success) {
          setError("login");
          return;
        }
        setProfile(profileBody.data);
        setOrders(ordersBody.data);
      })
      .catch(() => setError("connection"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="mt-6 h-28 w-full rounded-3xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 w-full rounded-3xl" />
      </AccountLayout>
    );
  }

  if (error || !orders) {
    return (
      <AccountLayout>
        <ErrorState
          message={t("loadError")}
          action={
            <Link href="/login?next=/account">
              <Button variant="primary">{t("goToLogin")}</Button>
            </Link>
          }
        />
      </AccountLayout>
    );
  }

  const statusCounts = ordersByStatus(orders);
  const spend = computeSpendSummary(orders);
  const monthlySpend = computeMonthlySpend(orders);
  const hasSpendData = monthlySpend.some((m) => m.total > 0);
  const thisMonth = monthlySpend[monthlySpend.length - 1]?.total ?? 0;
  const lastMonth = monthlySpend[monthlySpend.length - 2]?.total ?? 0;
  const monthDelta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const completeness = profile ? profileCompleteness(profile) : 100;

  return (
    <AccountLayout>
      <DashboardHero fullName={profile?.full_name ?? null} avatarUrl={profile?.avatar_url ?? null} />

      <LoyaltyOverviewCard />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi tone="primary" icon={Package} label={t("totalOrders")} value={String(orders.length)} />
        <Kpi tone="success" icon={Wallet} label={t("totalSpent")} value={spend.countedOrders > 0 ? <FitMoney amount={spend.totalSpent} currency={spend.currency} /> : "—"} />
        <Kpi tone="info" icon={ShoppingBag} label={t("averageOrderValue")} value={spend.countedOrders > 0 ? <FitMoney amount={spend.averageOrderValue} currency={spend.currency} /> : "—"} />
        <Kpi tone="warning" icon={Truck} label={t("activeOrders")} value={String(activeOrders.length)} />
      </div>

      {orders.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section className="nz-glass rounded-3xl p-5 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <TrendingUp className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h2 className="text-sm font-semibold text-ink">{t("spendTrend")}</h2>
              </div>
              {hasSpendData && (
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{t("thisMonth")}</p>
                  <p className="text-lg font-bold tabular-nums text-ink">{formatMoney(thisMonth, spend.currency)}</p>
                  {monthDelta !== null ? (
                    <p className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${monthDelta >= 0 ? "text-success" : "text-danger"}`}>
                      {monthDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />}
                      {Math.abs(monthDelta)}% <span className="font-normal text-ink-soft">{t("vsLastMonth")}</span>
                    </p>
                  ) : (
                    thisMonth > 0 && <p className="text-xs font-semibold text-success">{t("newThisMonth")}</p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4">
              {hasSpendData ? (
                <TrendLine points={monthlySpend.map((m) => m.total)} labels={monthlySpend.map((m) => m.monthLabel)} height={150} formatValue={(v) => formatMoney(v, spend.currency)} />
              ) : (
                <p className="py-10 text-center text-sm text-ink-muted">{t("noSpendDataYet")}</p>
              )}
            </div>
          </section>

          <section className="nz-glass rounded-3xl p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <PieChart className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <h2 className="text-sm font-semibold text-ink">{t("ordersByStatus")}</h2>
            </div>
            <DonutChart
              size={136}
              centerValue={String(orders.length)}
              centerLabel={t("totalOrders")}
              segments={Object.entries(statusCounts).map(([status, count], i) => ({ label: tOrders(`status.${status}` as "status.draft"), value: count, color: STATUS_COLORS[status] ?? chartColor(i) }))}
            />
          </section>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RecentOrders orders={orders.slice(0, 5)} totalCount={orders.length} />

        <aside className="space-y-6">
          {activeOrders.length > 0 && <ActiveOrderCard order={activeOrders[0]} extraCount={activeOrders.length - 1} />}
          {profile && <DailyPlanCard heightCm={profile.height_cm} weightKg={profile.weight_kg} goal={profile.goal} birthday={profile.birthday} />}
          <RunningLowCard />

          {completeness < 100 && (
            <Link href="/profile" className="nz-glass nz-glass-interactive group flex items-center gap-4 rounded-3xl p-5">
              <ProgressRing value={completeness} from="#3b82f6" to="#22c55e" size={64} stroke={6}>
                <span className="text-sm font-bold tabular-nums text-ink">{completeness}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  <UserRoundPen className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
                  {t("completeProfileTitle")}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{t("completeProfileText", { percent: completeness })}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
            </Link>
          )}

          <Link href="/account/product-requests" className="nz-glass nz-glass-interactive group flex items-center gap-4 rounded-3xl p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-300">
              <PackageSearch className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{t("findProductTitle")}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{t("findProductText")}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
          </Link>

          <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,color-mix(in_srgb,var(--nz-primary)_92%,black),color-mix(in_srgb,var(--nz-primary)_55%,#0e9f5f))] p-5 text-white shadow-[0_24px_48px_-24px_rgba(var(--nz-primary-rgb),0.8)]">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <LifeBuoy className="relative h-7 w-7 opacity-90" strokeWidth={1.6} aria-hidden="true" />
            <p className="relative mt-3 font-semibold">{t("needHelpTitle")}</p>
            <p className="relative mt-1 text-sm text-white/80">{t("needHelpText")}</p>
            <Link href="/account/chat" className="relative mt-4 inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[var(--nz-primary)] transition-transform hover:-translate-y-0.5">
              {t("needHelpCta")}
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </AccountLayout>
  );
}

function Kpi({ tone, icon: Icon, label, value }: { tone: Tone; icon: typeof Package; label: string; value: React.ReactNode }) {
  const { tile, glow } = TONES[tone];
  return (
    <div className="nz-glass relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" style={{ background: glow }} />
      <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${tile}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="relative mt-3 truncate text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl">{value}</p>
      <p className="relative mt-0.5 truncate text-xs font-medium text-ink-soft">{label}</p>
    </div>
  );
}
