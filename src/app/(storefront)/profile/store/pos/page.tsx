"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, History, LockKeyhole, MonitorSmartphone, ShoppingBag } from "lucide-react";
import { useStoreOrders } from "@/components/store-dashboard/useStoreOrders";
import PosAnalytics from "@/components/store-pos/PosAnalytics";
import PosTerminal from "@/components/store-pos/PosTerminal";
import SalesHistory from "@/components/store-pos/SalesHistory";
import SessionsList from "@/components/store-pos/SessionsList";
import StockView from "@/components/store-pos/StockView";
import { usePosErrors } from "@/components/store-pos/usePosErrors";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";

const TABS = [
  { key: "register", icon: MonitorSmartphone },
  { key: "sales", icon: History },
  { key: "analytics", icon: BarChart3 },
  { key: "stock", icon: Boxes },
  { key: "shifts", icon: LockKeyhole },
] as const;

function PosPageInner() {
  const t = useTranslations("storePos");
  const { store } = useStoreDashboard();
  const explain = usePosErrors();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // a cashier works the till; the store's business analytics stay with the owner
  const tabs = store?.my_role === "cashier" ? TABS.filter((x) => x.key !== "analytics") : TABS;
  const tab = (tabs.find((x) => x.key === params.get("tab"))?.key ?? "register") as (typeof TABS)[number]["key"];
  const { data: orders } = useStoreOrders("active");
  const waiting = (orders?.counts.new ?? 0) + (orders?.counts.ready ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {store?.kassa_name ?? store?.name ?? t("eyebrow")}
            {store?.my_role === "cashier" && <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] tracking-wider">{t("roleCashier")}</span>}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{t("title")}</h1>
        </div>
        <div role="tablist" aria-label={t("title")} className="nz-liquid inline-flex max-w-full overflow-x-auto rounded-2xl p-1 scrollbar-none">
          {tabs.map(({ key, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              type="button"
              onClick={() => router.replace(key === "register" ? pathname : `${pathname}?tab=${key}`, { scroll: false })}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-primary text-primary-contrast shadow" : "text-ink-muted hover:text-ink"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "register" && waiting > 0 && (
        // online orders the counter must not miss: new ones to accept, pickups waiting for their customer
        <Link href="/profile/store/orders" className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-ink">
          <ShoppingBag className="h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
          <span className="flex-1">
            <b>{t("ordersStripTitle", { count: waiting })}</b>
            <span className="block text-xs text-ink-muted">{t("ordersStripBody", { fresh: orders?.counts.new ?? 0, ready: orders?.counts.ready ?? 0 })}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-orange-500" aria-hidden="true" />
        </Link>
      )}
      {tab === "register" && <PosTerminal />}
      {tab === "sales" && <SalesHistory explain={explain} />}
      {tab === "analytics" && <PosAnalytics />}
      {tab === "stock" && <StockView />}
      {tab === "shifts" && <SessionsList />}
    </div>
  );
}

export default function StorePosPage() {
  return (
    <Suspense fallback={null}>
      <PosPageInner />
    </Suspense>
  );
}
