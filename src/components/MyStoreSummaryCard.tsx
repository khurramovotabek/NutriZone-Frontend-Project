"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import MediaImage from "@/components/MediaImage";

interface MyStoreSummary {
  name: string;
  status: "active" | "inactive" | "temporarily_closed" | "coming_soon";
  logo_url: string | null;
  is_open_now: boolean;
  my_role?: "owner" | "cashier";
}

export default function MyStoreSummaryCard() {
  const t = useTranslations("myStore");
  const [store, setStore] = useState<MyStoreSummary | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/my-store")
      .then(async (res) => {
        if (!res.ok) return; // 404 for an ordinary customer -- no store, nothing to show.
        const body = await res.json();
        if (body?.success) setStore(body.data);
      })
      .catch(() => {
        // Silent -- this is a bonus section, never blocks the rest of Profile.
      })
      .finally(() => setChecked(true));
  }, []);

  if (!checked || !store) return null;

  const statusLabel =
    store.status === "temporarily_closed" ? t("temporarilyClosed") : store.status === "coming_soon" ? t("comingSoon") : store.is_open_now ? t("open") : t("closed");
  const statusColor = store.status === "active" && store.is_open_now ? "text-primary" : "text-ink-muted";

  return (
    <Link href={store.my_role === "cashier" ? "/profile/store/pos" : "/profile/store"} className="nz-glass nz-glass-interactive mt-6 flex items-center justify-between rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
          <MediaImage src={store.logo_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Store className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{store.my_role === "cashier" ? t("myKassa") : t("myStore")}</p>
          <p className="font-medium text-ink">{store.name}</p>
          <p className={`text-xs font-medium ${statusColor}`}>
            ● {statusLabel}
            {store.my_role === "cashier" && <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 font-bold text-primary">{t("cashierRole")}</span>}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-soft" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
