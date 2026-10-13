"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, PauseCircle, PlayCircle } from "lucide-react";
import { money, pos, timeOnly } from "./api";
import type { PosError, PosSale } from "./types";

type Parked = { id: string; label: string; parked_at: string; items: number; total: string; cashier: string; customer: string | null };

/**
 * "Kutishga qo'yish": the customer forgot their wallet or went back for one more thing -- the basket goes on hold, the
 * next customer is served, and the held basket comes back with one tap. Held baskets live on the server (any cashier of
 * the kassa sees them, a refreshed tab loses nothing); resuming one puts the basket in progress on hold in its place.
 */
export default function ParkedBaskets({ sale, hasItems, onSale, explain, say, parkSignal }: {
  sale: PosSale | null;
  hasItems: boolean;
  onSale: (sale: PosSale) => void;
  explain: (error: PosError) => string;
  say: (tone: "error" | "ok", text: string) => void;
  /** bumps when the till's F8 asks to put the basket on hold */
  parkSignal: number;
}) {
  const t = useTranslations("storePos.parked");
  const [list, setList] = useState<Parked[]>([]);
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const res = await pos<{ results: Parked[] }>("sales/parked");
    if (res.ok) setList(res.data.results);
  }, []);

  useEffect(() => {
    const first = setTimeout(reload, 0);
    const id = setInterval(reload, 30_000); // another cashier may park / resume at the same kassa
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [reload]);

  useEffect(() => {
    if (parkSignal && hasItems) setTimeout(() => setAsking(true), 0);
  }, [parkSignal, hasItems]);

  useEffect(() => {
    if (!open && !asking) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) {
        setOpen(false);
        setAsking(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, asking]);

  async function park() {
    if (!sale || busy) return;
    setBusy(true);
    const res = await pos<PosSale>(`sales/${sale.id}/park`, { method: "POST", body: { label } });
    setBusy(false);
    if (!res.ok) return say("error", explain(res.error));
    onSale(res.data);
    setAsking(false);
    setLabel("");
    say("ok", t("parkedOk"));
    reload();
  }

  async function resume(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await pos<PosSale>(`sales/${id}/resume`, { method: "POST", body: {} });
    setBusy(false);
    if (!res.ok) {
      reload();
      return say("error", explain(res.error));
    }
    onSale(res.data);
    setOpen(false);
    say("ok", hasItems ? t("swapped") : t("resumed"));
    reload();
  }

  if (!hasItems && list.length === 0) return null;
  return (
    <div ref={box} className="border-b border-border/60 bg-amber-500/5 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        {list.length > 0 ? (
          <button type="button" onClick={() => { setOpen((v) => !v); setAsking(false); }} aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-transform hover:scale-[1.03]">
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t("onHold", { count: list.length })}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        ) : <span className="text-[11px] text-ink-soft">{t("noneHeld")}</span>}
        {hasItems && (
          <button type="button" onClick={() => { setAsking((v) => !v); setOpen(false); }} disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300" title={`${t("park")} (F8)`}>
            <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t("park")}
            <kbd className="rounded border border-amber-500/40 px-1 font-mono text-[10px]">F8</kbd>
          </button>
        )}
      </div>

      {asking && (
        <form onSubmit={(e) => { e.preventDefault(); park(); }} className="mt-2 rounded-2xl border border-amber-500/30 bg-surface p-3">
          <p className="text-xs font-bold text-ink">{t("parkTitle")}</p>
          <p className="mt-0.5 text-[11px] text-ink-soft">{t("parkHint")}</p>
          <div className="mt-2 flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 60))} autoFocus placeholder={t("labelPlaceholder")}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-sm text-ink outline-none focus:border-amber-500" />
            <button type="submit" disabled={busy} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60" aria-label={t("parkConfirm")}>
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              OK
            </button>
          </div>
        </form>
      )}

      {open && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-amber-500/30 bg-surface">
          <ul className="max-h-60 divide-y divide-border/50 overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => resume(p.id)} disabled={busy} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/8 disabled:opacity-60">
                  <PlayCircle className="h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.label || p.customer || t("noLabel")}</span>
                    <span className="block text-[11px] text-ink-soft tabular-nums">
                      {timeOnly(p.parked_at)} · {t("items", { count: p.items })}{p.cashier ? ` · ${p.cashier}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink tabular-nums">{money(p.total)}</span>
                </button>
              </li>
            ))}
          </ul>
          {hasItems && <p className="border-t border-border/60 px-3 py-2 text-[11px] text-ink-soft">{t("swapHint")}</p>}
        </div>
      )}
    </div>
  );
}
