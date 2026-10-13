"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Check, ChevronDown, Crown } from "lucide-react";
import { pos, setHandover } from "./api";
import CashierAvatar from "./CashierAvatar";
import PinPad from "./PinPad";
import type { PosConfig, PosError, PosPerson } from "./types";

/**
 * "Who is selling" chip. Several cashiers can share one computer: pick your name and type the kassa PIN -- from then
 * on every sale is recorded under you (the signed token lives in this tab only). Going back to the account that is
 * signed in on this computer needs no PIN.
 */
export default function CashierSwitcher({ config, onSwitched, disabled }: { config: PosConfig; onSwitched: (p: PosPerson) => void; disabled?: boolean }) {
  const t = useTranslations("storePos.cashiers");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PosPerson | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = config.cashier;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function pick(p: PosPerson) {
    setOpen(false);
    if (p.id === current.id) return;
    if (config.me && p.id === config.me.id) {
      setHandover(null); // back to the signed-in account: no PIN needed
      onSwitched(p);
      return;
    }
    setTarget(p);
  }

  async function confirm(pin: string): Promise<PosError | null> {
    if (!target) return null;
    const res = await pos<{ token: string; cashier: PosPerson }>("cashier", { method: "POST", body: { cashier_id: target.id, pin } });
    if (!res.ok) return res.error;
    setHandover(res.data.token);
    setTarget(null);
    onSwitched(res.data.cashier);
    return null;
  }

  const many = config.cashiers.length > 1;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => many && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup={many ? "listbox" : undefined}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface/70 py-1 pl-1 pr-2.5 text-left transition-colors ${many ? "hover:border-primary/60" : "cursor-default"} disabled:opacity-60`}
        title={many ? t("switch") : undefined}
      >
        <CashierAvatar person={current} size="sm" />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase leading-none tracking-wider text-ink-soft">{t("selling")}</span>
          <span className="block max-w-[150px] truncate text-xs font-bold text-ink">{current.full_name}</span>
        </span>
        {many && <ChevronDown className={`h-3.5 w-3.5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.25} aria-hidden="true" />}
      </button>

      {open && (
        <div role="listbox" aria-label={t("switch")} className="nz-glass-strong animate-nz-sheet-up absolute left-0 top-full z-[60] mt-2 w-72 rounded-2xl p-2 shadow-2xl">
          <p className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("handOver")}
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {config.cashiers.map((p) => {
              const active = p.id === current.id;
              const isMe = config.me?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(p)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${active ? "bg-primary/10" : "hover:bg-surface-2"}`}
                  >
                    <CashierAvatar person={p} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                        {p.full_name}
                        {p.role === "owner" && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2.25} aria-label={t("owner")} />}
                      </span>
                      <span className="block truncate text-[11px] text-ink-soft">{isMe ? t("thisAccount") : active ? t("sellingNow") : t("needsPin")}</span>
                    </span>
                    {active && <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {target && (
        <PinPad
          title={target.full_name}
          subtitle={t("pinSubtitle", { kassa: config.kassa.name })}
          badge={<CashierAvatar person={target} size="lg" />}
          onSubmit={confirm}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
