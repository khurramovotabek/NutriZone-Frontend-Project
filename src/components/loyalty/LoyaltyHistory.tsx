"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Gift, Hourglass, Loader2, RotateCcw, ShoppingBag, ShoppingCart, Sparkles, Undo2 } from "lucide-react";
import type { WalletDirection, WalletTransaction } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { formatPercent, formatSom } from "@/components/loyalty/format";
import { formatDate } from "@/lib/dates";

type Filter = "all" | WalletDirection;
type Page = { data: WalletTransaction[]; totalPages: number };

async function fetchPage(page: number, filter: Filter): Promise<Page | null> {
  try {
    const res = await fetch(`/api/loyalty/transactions?page=${page}${filter === "all" ? "" : `&direction=${filter}`}`);
    const body = await res.json();
    return res.ok && body?.success ? { data: body.data, totalPages: body.pagination?.total_pages ?? 0 } : null;
  } catch {
    return null;
  }
}

const KIND_ICON = { earn: ArrowDownLeft, referral: Gift, refund: RotateCcw, adjustment: Sparkles, spend: ShoppingCart, reversal: Undo2, expiry: Hourglass } as const;

/**
 * Wallet ledger. Full mode: All / Received / Spent filtered by the API (so
 * paging stays correct), grouped by month, with "show more". Compact mode:
 * the latest few rows only, for the overview tab.
 */
export default function LoyaltyHistory({ compact = false, onSeeAll }: { compact?: boolean; onSeeAll?: () => void }) {
  const t = useTranslations("loyalty");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedFor, setLoadedFor] = useState<Filter | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPage(1, filter).then((result) => {
      if (cancelled) return;
      setRows(result?.data ?? []);
      setPage(1);
      setTotalPages(result?.totalPages ?? 0);
      setLoadedFor(filter);
    });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function more() {
    setBusy(true);
    const result = await fetchPage(page + 1, filter);
    if (result) {
      setRows((prev) => [...prev, ...result.data]);
      setPage(page + 1);
      setTotalPages(result.totalPages);
    }
    setBusy(false);
  }

  const loading = loadedFor !== filter;
  const visible = compact ? rows.slice(0, 4) : rows;

  // Month groups, newest first (rows already arrive newest first).
  const groups: { key: string; label: string; rows: WalletTransaction[] }[] = [];
  for (const tx of visible) {
    const d = new Date(tx.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (groups.at(-1)?.key !== key) groups.push({ key, label: formatDate(d, locale, "monthYear"), rows: [] });
    groups.at(-1)!.rows.push(tx);
  }

  const empty = !loading && filter === "all" && rows.length === 0;

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-ink">{t("history.title")}</h2>
          {!empty && (
            <div role="tablist" aria-label={t("history.title")} className="nz-seg">
              {(["all", "in", "out"] as const).map((f) => (
                <button key={f} role="tab" type="button" aria-selected={filter === f} onClick={() => setFilter(f)} className="nz-seg-btn">
                  {t(`history.filter.${f}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="nz-liquid space-y-3 rounded-3xl p-5" aria-hidden="true">
          {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-surface-3/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-3/60" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-3/40" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-surface-3/60" />
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="nz-liquid flex flex-col items-center rounded-3xl px-6 py-12 text-center">
          <CoinIcon size={56} className="nz-coin-float" />
          <p className="mt-4 text-base font-bold text-ink">{t("history.emptyTitle")}</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("history.emptyBody")}</p>
          <Link href="/products" className="nz-cta nz-shimmer-btn mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("history.shop")}
          </Link>
        </div>
      ) : (
        <div className={`nz-liquid overflow-hidden rounded-3xl transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {visible.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-ink-muted">{t("history.filterEmpty")}</p>
          ) : (
            groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                {!compact && <p className="border-b border-border/40 bg-surface-2/30 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft sm:px-6">{g.label}</p>}
                <ul className="divide-y divide-border/40">
                  {g.rows.map((tx) => (
                    <HistoryRow key={tx.id} tx={tx} />
                  ))}
                </ul>
              </section>
            ))
          )}
          {compact
            ? onSeeAll &&
              rows.length > 0 && (
                <button type="button" onClick={onSeeAll} className="group flex w-full items-center justify-center gap-1 border-t border-border/40 p-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft/40">
                  {t("account.seeAll")}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
                </button>
              )
            : page < totalPages && (
                <div className="border-t border-border/40 p-3 text-center">
                  <button type="button" onClick={more} disabled={busy} className="nz-liquid-chip inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
                    {busy ? t("history.loading") : t("history.more")}
                  </button>
                </div>
              )}
        </div>
      )}
    </div>
  );
}

const dotted = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

function HistoryRow({ tx }: { tx: WalletTransaction }) {
  const t = useTranslations("loyalty");
  const positive = tx.amount > 0;
  // Order numbers only for the customer's own purchases (a referral row references the friend's order); staff notes only on manual adjustments.
  const orderNumber = ["earn", "spend", "refund", "reversal"].includes(tx.kind) ? tx.order_number : null;
  const note = tx.kind === "adjustment" ? tx.note : null;
  const Icon = KIND_ICON[tx.kind] ?? ArrowUpRight;
  const d = new Date(tx.created_at);
  const date = dotted(d);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const tone = positive ? "nz-tx-in" : tx.kind === "expiry" ? "nz-tx-burn" : "nz-tx-out";

  const body = (
    <>
      <div className={`nz-tx-icon ${tone} flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11`}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {t(`history.kind.${tx.kind}`)}
          {orderNumber && <span className="block text-xs font-medium text-ink-soft sm:ml-1.5 sm:inline sm:text-sm">#{orderNumber.replace(/^#/, "")}</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted tabular-nums">
          {date} · {time}
          {tx.kind === "earn" && tx.order_amount && tx.tier_percent && ` · ${t("history.detail", { amount: formatSom(tx.order_amount), tier: tx.tier_name ?? "", percent: formatPercent(tx.tier_percent) })}`}
          {note && ` · ${note}`}
        </p>
        {tx.expires_at && (
          <p className="mt-1 flex max-w-full items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 tabular-nums sm:inline-flex dark:text-amber-300">
            <Hourglass className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span className="truncate">{t("history.expires", { coins: formatSom(tx.remaining), date: dotted(new Date(tx.expires_at)) })}</span>
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={`flex items-center justify-end gap-1.5 text-base font-extrabold tabular-nums ${positive ? "text-success" : tx.kind === "expiry" ? "text-ink-soft" : "text-red-600 dark:text-red-400"}`}>
          {positive ? "+" : "−"}
          {formatSom(Math.abs(tx.amount))}
          <CoinIcon size={16} />
        </p>
        <p className="hidden text-[11px] text-ink-soft tabular-nums sm:block">{t("history.balanceAfter", { balance: formatSom(tx.balance_after) })}</p>
      </div>
      {tx.order_linkable && orderNumber && <ChevronRight className="-mr-1 h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />}
    </>
  );

  const cls = "group flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4 transition-colors hover:bg-surface-2/35";
  return (
    <li>
      {tx.order_linkable && orderNumber ? (
        <Link href={`/orders/${orderNumber}`} className={cls} aria-label={`${t(`history.kind.${tx.kind}`)} #${orderNumber} — ${t("history.viewOrder")}`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
