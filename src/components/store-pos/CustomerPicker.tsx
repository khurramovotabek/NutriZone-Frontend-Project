"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, UserPlus, UserRound, X } from "lucide-react";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { money, pos } from "./api";
import type { PosCustomer, PosError, PosSale } from "./types";

/**
 * Buyer selection: search this store's own buyers by name/phone (or anyone by
 * their exact phone), see their tier and coin balance, or register a walk-in
 * customer by phone + name. Attaching a customer unlocks paying with coins
 * and earns them cashback on this sale.
 */
export default function CustomerPicker({ sale, onSale, explain }: { sale: PosSale; onSale: (s: PosSale) => void; explain: (e: PosError) => string }) {
  const t = useTranslations("storePos.customer");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    let cancelled = false;
    const handle = setTimeout(() => {
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      pos<PosCustomer[]>(`customers?q=${encodeURIComponent(term)}`).then((res) => {
        if (cancelled) return;
        setSearching(false);
        setResults(res.ok ? res.data : []);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, open]);

  async function attach(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await pos<PosSale>(`sales/${sale.id}/customer`, { method: "POST", body });
    setBusy(false);
    if (res.ok) {
      onSale(res.data);
      setOpen(false);
      setCreating(false);
      setQ("");
      setName("");
      return;
    }
    if (res.error.code === "NEW_CUSTOMER_NAME_REQUIRED") {
      setCreating(true);
      return;
    }
    setError(explain(res.error));
  }

  async function detach() {
    const res = await pos<PosSale>(`sales/${sale.id}/customer`, { method: "DELETE" });
    if (res.ok) onSale(res.data);
  }

  const c = sale.customer;

  if (c && !open) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-surface-2/70 to-surface-2/20 p-3">
        {c.tier && <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl" style={{ background: c.tier.color }} />}
        <div className="relative flex items-center gap-3">
          {c.tier ? <TierBadge icon={c.tier.icon} color={c.tier.color} size={40} className="shrink-0" /> : <UserRound className="h-10 w-10 shrink-0 rounded-full bg-primary-soft p-2 text-primary" strokeWidth={1.75} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{c.full_name || c.phone_number}</p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              {c.phone_number}
              {c.tier && (
                <span className="ml-1.5 font-semibold" style={{ color: c.tier.color }}>
                  · {c.tier.name} {c.tier.percent}%
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-sm font-extrabold text-ink tabular-nums">
              <CoinIcon size={16} />
              {money(c.balance)}
            </p>
            <div className="mt-0.5 flex justify-end gap-2 text-[11px] font-semibold">
              <button type="button" onClick={() => setOpen(true)} className="text-primary hover:underline">
                {t("change")}
              </button>
              <button type="button" onClick={detach} className="text-ink-soft hover:text-red-600" aria-label={t("remove")}>
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 text-left transition-colors hover:border-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink group-hover:text-primary">{t("add")}</span>
          <span className="block text-[11px] text-ink-soft">{t("addHint")}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-primary/40 bg-primary-soft/40 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} aria-hidden="true" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCreating(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) attach({ customer_id: results[0].id });
              else if (/^\+?\d{9,15}$/.test(q.replace(/\s+/g, ""))) attach({ phone_number: q.replace(/\s+/g, "") });
            }
          }}
          placeholder={t("searchPlaceholder")}
          className="nz-glass-input w-full rounded-xl py-2.5 pl-9 pr-9 text-sm"
          aria-label={t("searchPlaceholder")}
        />
        <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1 text-ink-soft hover:text-ink" aria-label={t("cancel")}>
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {searching && (
        <p className="flex items-center gap-2 px-1 text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          {t("searching")}
        </p>
      )}

      {results.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" disabled={busy} onClick={() => attach({ customer_id: r.id })} className="flex w-full items-center gap-2.5 rounded-xl bg-surface/70 p-2 text-left transition-colors hover:bg-surface">
                {r.tier ? <TierBadge icon={r.tier.icon} color={r.tier.color} size={30} /> : <UserRound className="h-7 w-7 text-ink-soft" strokeWidth={1.5} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.full_name || r.phone_number}</span>
                  <span className="block text-[11px] text-ink-soft tabular-nums">{r.phone_number}</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-ink tabular-nums">
                  <CoinIcon size={14} />
                  {money(r.balance)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && q.trim().length >= 2 && results.length === 0 && !creating && (
        <div className="rounded-xl bg-surface/60 p-2.5 text-xs text-ink-muted">
          {/^\+?\d{9,15}$/.test(q.replace(/\s+/g, "")) ? (
            <button type="button" onClick={() => attach({ phone_number: q.replace(/\s+/g, "") })} className="font-semibold text-primary hover:underline">
              {t("usePhone", { phone: q.trim() })}
            </button>
          ) : (
            t("notFoundHint")
          )}
        </div>
      )}

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            attach({ phone_number: q.replace(/\s+/g, ""), full_name: name });
          }}
          className="space-y-2 rounded-xl bg-surface/70 p-2.5"
        >
          <p className="text-xs font-semibold text-ink">{t("newCustomer", { phone: q.trim() })}</p>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className="nz-glass-input w-full rounded-lg px-3 py-2 text-sm" aria-label={t("namePlaceholder")} />
          <button type="submit" disabled={busy || !name.trim()} className="nz-cta inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {t("create")}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="px-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
