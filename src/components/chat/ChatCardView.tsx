"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Receipt, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ChatCard } from "@/lib/account-api";

function money(value: string | null | undefined): string {
  return Math.round(Number(value) || 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

/**
 * A product or order the other side shared in the chat (message_type "card"): photo / status, price / total and a
 * link to the product page or the order. The backend resolves it when the message is read, so it always shows the
 * current price, stock and order status; a removed product renders an honest "no longer available" line.
 */
export default function ChatCardView({ card }: { card: ChatCard | null | undefined }) {
  const t = useTranslations("chatRealtime");
  const statusT = useTranslations("orders.status");
  const locale = useLocale();
  if (!card) return <p className="nz-glass rounded-2xl px-3.5 py-2.5 text-xs italic text-ink-soft">{t("cardMissing")}</p>;

  if (card.kind === "order") {
    return (
      <Link href={card.url} className="nz-glass group flex w-64 items-center gap-3 rounded-2xl p-3 transition-transform hover:-translate-y-0.5 sm:w-72">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Receipt className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-soft">{t("cardOrder")} · {card.date}</span>
          <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary">{card.title}</span>
          <span className="block text-xs text-ink-muted">
            {card.status && statusT.has(card.status) ? statusT(card.status) : card.status_label} · {t("cardItems", { count: card.units ?? 0 })} · {money(card.total)} so&apos;m
          </span>
          {card.eta && (
            <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
              <Truck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {t("cardEta", { date: card.eta })}
            </span>
          )}
        </span>
      </Link>
    );
  }

  const title = (card.names && (card.names[locale] || card.names.uz)) || card.title;
  return (
    <Link href={card.url} className="nz-glass group flex w-64 items-center gap-3 rounded-2xl p-3 transition-transform hover:-translate-y-0.5 sm:w-72">
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        {card.image ? <Image src={card.image} alt="" fill sizes="64px" className="object-contain p-1" unoptimized /> : <Package className="h-6 w-6 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-soft">{t("cardProduct")}</span>
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-primary">{title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs">
          {card.price && <span className="font-bold text-ink">{money(card.price)} so&apos;m</span>}
          <span className={card.in_stock ? "font-semibold text-success" : "font-semibold text-red-500"}>{card.in_stock ? t("cardInStock") : t("cardOutOfStock")}</span>
        </span>
      </span>
    </Link>
  );
}
