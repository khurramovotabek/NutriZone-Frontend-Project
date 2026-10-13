"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarDays, CheckCircle2, KeyRound, LockOpen, NotebookPen, Store as StoreIcon, Users } from "lucide-react";
import { pos } from "./api";
import CashierAvatar from "./CashierAvatar";
import EarningsCard from "./EarningsCard";
import PinPad from "./PinPad";
import type { PosConfig, PosError, PosSession } from "./types";

/**
 * Start-of-shift screen. The kassa stays closed until a cashier opens the shift: an optional note, then the kassa's
 * shared PIN. No cash count is asked -- the Z-report counts what the shift took. Time and cashier are recorded.
 */
export default function RegisterGate({ config, onOpened, explain }: { config: PosConfig; onOpened: (s: PosSession) => void; explain: (e: PosError) => string }) {
  const t = useTranslations("storePos.session");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  async function open(pin: string): Promise<PosError | null> {
    const res = await pos<PosSession>("session/open", { method: "POST", body: { note, pin } });
    if (res.ok) {
      setAsking(false);
      onOpened(res.data);
      return null;
    }
    if (["PIN_WRONG", "PIN_LOCKED", "KASSA_PIN_NOT_SET"].includes(res.error.code)) return res.error;
    return { ...res.error, message: explain(res.error) };
  }

  const noPin = !config.kassa.has_pin;
  const date = now?.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="nz-liquid relative overflow-hidden rounded-[2rem]">
      <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/60 px-3 py-1 text-xs font-semibold text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            {t("closedBadge")}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t("openTitle")}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{t("openBodyPin")}</p>

          <dl className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2/40 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <StoreIcon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t("kassa")}</dt>
                <dd className="truncate font-bold text-ink">{config.kassa.name}</dd>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {date ?? t("now")}
              </dt>
              <dd className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{now ? now.toLocaleTimeString("ru-RU") : "—"}</dd>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t("cashier")}</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-ink">
                <CashierAvatar person={config.cashier} size="sm" />
                <span className="truncate">{config.cashier.full_name}</span>
              </dd>
            </div>
          </dl>

          {config.earnings && (
            <div className="mt-5 max-w-md">
              <EarningsCard e={config.earnings} />
            </div>
          )}

          {config.cashiers.length > 1 && (
            <div className="mt-5 max-w-md">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {t("team", { count: config.cashiers.length })}
              </p>
              <div className="mt-2 flex -space-x-2">
                {config.cashiers.slice(0, 8).map((p) => (
                  <CashierAvatar key={p.id} person={p} ring title={p.full_name} />
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!noPin) setAsking(true);
          }}
          className="nz-glass-strong rounded-3xl p-6 sm:p-7"
        >
          <ul className="space-y-2.5 text-sm">
            {[t("checkTime"), t("checkCashierPin"), t("checkNoCash"), t("checkReport")].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-ink-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.25} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <label className="mt-5 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {t("noteLabel")}
            </span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("notePlaceholder")} className="nz-glass-input w-full rounded-xl px-3.5 py-3 text-base sm:text-sm" />
          </label>
          {noPin && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/12 px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              {t("noPin")}
            </p>
          )}
          <button
            type="submit"
            disabled={noPin}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            <LockOpen className="h-5 w-5" strokeWidth={2} />
            {t("openButton")}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-soft">
            <KeyRound className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            {t("openHintPin")}
          </p>
        </form>
      </div>

      {asking && <PinPad title={t("pinTitle")} subtitle={t("pinSubtitle", { kassa: config.kassa.name })} onSubmit={open} onClose={() => setAsking(false)} />}
    </div>
  );
}
