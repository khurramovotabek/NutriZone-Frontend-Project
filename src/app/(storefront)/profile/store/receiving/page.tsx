"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PackageCheck } from "lucide-react";
import ReceiveWorkspace from "@/components/store-transfers/ReceiveWorkspace";
import TransferList from "@/components/store-transfers/TransferList";

/**
 * Do'kon paneli → Mahsulot qabul qilish: transfers coming to this branch (from the warehouse or another branch).
 * The list, then one transfer's receiving screen (?t=<id>): scan every unit, compare with what was sent per batch,
 * receive partially or confirm. Owner and cashiers both receive; settling a difference stays with the manager.
 */
function ReceivingInner() {
  const t = useTranslations("myStore.receiving");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get("t");
  const open = useCallback((tid: string | null) => router.push(tid ? `${pathname}?t=${tid}` : pathname), [router, pathname]);

  return (
    <div className="grid gap-4">
      {!id && (
        <header className="flex items-start gap-3">
          <span className="nz-cta flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"><PackageCheck className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">{t("title")}</h1>
            <p className="text-sm text-ink-muted">{t("subtitle")}</p>
          </div>
        </header>
      )}
      {id ? <ReceiveWorkspace key={id} transferId={id} onBack={() => open(null)} /> : <TransferList onOpen={open} />}
    </div>
  );
}

export default function StoreReceivingPage() {
  return (
    <Suspense fallback={null}>
      <ReceivingInner />
    </Suspense>
  );
}
