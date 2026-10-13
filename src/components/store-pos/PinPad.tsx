"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Delete, KeyRound, Loader2, Lock, X } from "lucide-react";
import type { PosError } from "./types";

const MIN = 4;
const MAX = 6;

/**
 * The kassa PIN pad -- one shared 4-6 digit PIN per kassa. Used to open the shift and to hand the terminal to another
 * cashier. Works with the on-screen keys, a hardware keyboard (digits, Backspace, Enter, Esc) and a numpad.
 * `onSubmit` resolves to an error (wrong PIN: shake + attempts left; locked: countdown) or null on success.
 */
export default function PinPad({
  title,
  subtitle,
  badge,
  onSubmit,
  onClose,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onSubmit: (pin: string) => Promise<PosError | null>;
  onClose: () => void;
}) {
  const t = useTranslations("storePos.pin");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const id = setInterval(() => setLockedFor((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockedFor]);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < MIN || busy || lockedFor > 0) return;
      setBusy(true);
      setError(null);
      const err = await onSubmit(value);
      setBusy(false);
      if (!err) return;
      setPin("");
      setShake((n) => n + 1);
      if (err.code === "PIN_LOCKED") {
        setLockedFor(Number(err.details?.seconds ?? 300));
        setError(t("locked"));
      } else if (err.code === "PIN_WRONG") {
        const left = Number(err.details?.left ?? 0);
        setError(left ? t("wrongLeft", { left }) : t("wrong"));
      } else if (err.code === "KASSA_PIN_NOT_SET") {
        setError(t("notSet"));
      } else {
        setError(err.message || t("failed"));
      }
    },
    [busy, lockedFor, onSubmit, t],
  );

  const press = useCallback(
    (key: string) => {
      if (busy || lockedFor > 0) return;
      setError(null);
      if (key === "del") setPin((p) => p.slice(0, -1));
      else if (key === "ok") submit(pin);
      else setPin((p) => (p.length < MAX ? p + key : p));
    },
    [busy, lockedFor, pin, submit],
  );

  function onKey(e: React.KeyboardEvent) {
    e.stopPropagation(); // the terminal's scanner / shortcut listener must never see PIN digits
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      press(e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      press("del");
    } else if (e.key === "Enter") {
      e.preventDefault();
      press("ok");
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  const mm = Math.floor(lockedFor / 60);
  const ss = String(lockedFor % 60).padStart(2, "0");

  // rendered on <body>: glass (backdrop-filter) ancestors would otherwise trap this fixed overlay inside their card
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="pinpad-title" onClick={onClose}>
      <div
        ref={boxRef}
        tabIndex={-1}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
        className="nz-glass-strong animate-nz-sheet-up relative w-full max-w-[360px] overflow-hidden rounded-[2rem] p-6 outline-none sm:p-7"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink" aria-label={t("cancel")}>
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="relative flex flex-col items-center text-center">
          {badge ?? (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <KeyRound className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            </span>
          )}
          <h2 id="pinpad-title" className="mt-4 text-xl font-extrabold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

          <div key={shake} className={`mt-5 flex h-5 items-center gap-3 ${shake ? "animate-nz-shake" : ""}`} aria-live="polite" aria-label={t("digits", { count: pin.length })}>
            {Array.from({ length: Math.max(MIN, pin.length + (pin.length < MAX ? 1 : 0)) }, (_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length ? "scale-110 border-emerald-500 bg-emerald-500 shadow-[0_0_12px] shadow-emerald-500/60" : i < MIN ? "border-ink-soft/50" : "border-dashed border-ink-soft/30"
                }`}
              />
            ))}
          </div>

          <p role="alert" className={`mt-3 min-h-[1.25rem] text-sm font-semibold ${lockedFor ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
            {lockedFor > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                {t("lockedFor", { time: `${mm}:${ss}` })}
              </span>
            ) : (
              error
            )}
          </p>

          <div className="mt-3 grid w-full grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"].map((k) => {
              const ok = k === "ok";
              const del = k === "del";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  disabled={busy || lockedFor > 0 || (ok && pin.length < MIN)}
                  aria-label={ok ? t("confirm") : del ? t("erase") : k}
                  className={`flex h-16 items-center justify-center rounded-2xl text-2xl font-bold tabular-nums transition-all duration-100 active:scale-95 disabled:opacity-40 ${
                    ok
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:brightness-110"
                      : del
                        ? "text-ink-muted hover:bg-surface-2"
                        : "border border-border/70 bg-surface-2/60 text-ink hover:border-emerald-500/60 hover:bg-surface-2"
                  }`}
                >
                  {ok ? busy ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.25} /> : <Check className="h-7 w-7" strokeWidth={2.5} /> : del ? <Delete className="h-6 w-6" strokeWidth={2} /> : k}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-ink-soft">{t("hint")}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
