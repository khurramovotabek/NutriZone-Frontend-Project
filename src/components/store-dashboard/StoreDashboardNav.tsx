"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Clock, ImageIcon, LayoutDashboard, MapPin, MessageCircle, MonitorSmartphone, PackageCheck, ShoppingBag, Store as StoreIcon, type LucideIcon } from "lucide-react";
import { useIncomingTransfers } from "@/components/store-transfers/useIncomingTransfers";
import { useChatUnread } from "@/hooks/useChatUnread";
import { useStoreDashboard } from "./StoreDashboardContext";
import { useStoreOrders } from "./useStoreOrders";

type Item = { href: string; labelKey: string; icon: LucideIcon; exact?: boolean; cashier?: boolean };
const GROUPS: { titleKey: string; items: Item[] }[] = [
  { titleKey: "navGroupSales", items: [
    { href: "/profile/store", labelKey: "navOverview", icon: LayoutDashboard, exact: true },
    { href: "/profile/store/orders", labelKey: "navOrders", icon: ShoppingBag, cashier: true },
    { href: "/profile/store/pos", labelKey: "navPos", icon: MonitorSmartphone, cashier: true },
    { href: "/profile/store/receiving", labelKey: "navReceiving", icon: PackageCheck, cashier: true },
    { href: "/profile/store/report", labelKey: "navReport", icon: BarChart3 },
  ] },
  { titleKey: "navGroupStore", items: [
    { href: "/profile/store/profile", labelKey: "navProfile", icon: StoreIcon },
    { href: "/profile/store/contact", labelKey: "navContact", icon: MapPin },
    { href: "/profile/store/hours", labelKey: "navHours", icon: Clock },
    { href: "/profile/store/gallery", labelKey: "navGallery", icon: ImageIcon },
  ] },
  { titleKey: "navGroupCustomers", items: [{ href: "/profile/store/inquiries", labelKey: "navInquiries", icon: MessageCircle }] },
];

export default function StoreDashboardNav({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("myStore");
  const unread = useChatUnread();
  const { store } = useStoreDashboard();
  const { data } = useStoreOrders("active");
  const incoming = useIncomingTransfers("incoming").data?.counts.incoming ?? 0;
  const cashier = store?.my_role === "cashier";
  const newOrders = data?.counts.new ?? 0;
  const activeOrders = data?.counts.active ?? 0;

  function badge(href: string, isActive: boolean) {
    const n = href === "/profile/store/inquiries" ? unread : href === "/profile/store/orders" ? (newOrders || activeOrders) : href === "/profile/store/receiving" ? incoming : 0;
    if (!n) return null;
    const hot = href === "/profile/store/inquiries" || href === "/profile/store/receiving" || newOrders > 0;
    return (
      <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${isActive ? "bg-white text-primary" : hot ? "bg-rose-500 text-white" : "bg-surface-2 text-ink"}`}>
        {n > 99 ? "99+" : n}
      </span>
    );
  }

  return (
    <nav aria-label={t("dashboardNavLabel")} className={`nz-glass flex gap-1.5 overflow-x-auto rounded-2xl p-2 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden ${horizontal ? "" : "lg:flex-col lg:overflow-visible"}`}>
      {GROUPS.map((group) => {
        // a cashier only works the kassa and hands over orders: the store's settings, gallery and inquiries stay with the owner
        const items = cashier ? group.items.filter((i) => i.cashier) : group.items;
        if (!items.length) return null;
        return (
          <div key={group.titleKey} className={`flex shrink-0 gap-1.5 ${horizontal ? "" : "lg:flex-col"}`}>
            {!horizontal && <p className="hidden px-3 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft lg:block">{t(group.titleKey)}</p>}
            {items.map(({ href, labelKey, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} aria-current={isActive ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? "nz-cta text-white shadow-md" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-white/20" : "bg-surface-2"}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{t(labelKey)}</span>
                  {badge(href, isActive)}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
