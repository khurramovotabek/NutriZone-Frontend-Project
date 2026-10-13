"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Coffee, Sun } from "lucide-react";
import { WEEKDAYS } from "@/components/store-dashboard/types";

type Day = { open: string; close: string; closed: boolean };
type Week = Record<string, Day>;

function minutes(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * The store's weekly schedule as seven rows: an Open / Day-off switch, two time pickers and the day's length.
 * Presets fill the whole week in one tap; every change is saved as the complete week (the API stores one object).
 */
export default function WeeklyHoursEditor({ value, onSave }: { value: Week; onSave: (week: Week) => void }) {
  const t = useTranslations("myStore");
  const [week, setWeek] = useState<Week>(() => Object.fromEntries(WEEKDAYS.map((c) => [c, value[c] ?? { open: "", close: "", closed: false }])));
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7);

  function apply(next: Week, save = true) {
    setWeek(next);
    if (!save) return;
    const valid = WEEKDAYS.every((c) => {
      const d = next[c];
      if (d.closed || (!d.open && !d.close)) return true;
      const o = minutes(d.open), cl = minutes(d.close);
      return o !== null && cl !== null && o < cl;
    });
    if (valid) onSave(next); // an unfinished / reversed day is shown as an error and not saved until fixed
  }

  const set = (code: string, patch: Partial<Day>, save = true) => apply({ ...week, [code]: { ...week[code], ...patch } }, save);
  const preset = (open: string, close: string, sundayOff: boolean) =>
    apply(Object.fromEntries(WEEKDAYS.map((c) => [c, sundayOff && c === "sun" ? { open: "", close: "", closed: true } : { open, close, closed: false }])));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => preset("09:00", "21:00", false)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400">
          <Sun className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          {t("presetEveryDay")}
        </button>
        <button type="button" onClick={() => preset("10:00", "20:00", true)} className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-3 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-500/20 dark:text-sky-400">
          <Coffee className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          {t("presetSundayOff")}
        </button>
        <button type="button" onClick={() => apply(Object.fromEntries(WEEKDAYS.map((c) => [c, { ...week.mon }])))} className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/12 px-3 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-400">
          <Copy className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          {t("presetCopyMonday")}
        </button>
      </div>

      <div className="space-y-2">
        {WEEKDAYS.map((code, i) => {
          const d = week[code];
          const o = minutes(d.open), c = minutes(d.close);
          const bad = !d.closed && (d.open || d.close) && !(o !== null && c !== null && o < c);
          const len = !d.closed && o !== null && c !== null && o < c ? c - o : null;
          return (
            <div
              key={code}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                i === todayIdx ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]" : "border-border/60 bg-surface-2/40"
              } ${d.closed ? "opacity-80" : ""}`}
            >
              <span className="w-24 shrink-0 text-sm font-bold text-ink">
                {t(code)}
                {i === todayIdx && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{t("today")}</span>}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!d.closed}
                onClick={() => set(code, d.closed ? { closed: false, open: d.open || "10:00", close: d.close || "20:00" } : { closed: true })}
                className="flex items-center gap-2 text-xs font-semibold"
              >
                <span className={`relative h-[22px] w-[38px] rounded-full transition-colors ${d.closed ? "bg-slate-500/50" : "bg-emerald-500"}`}>
                  <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${d.closed ? "left-[2px]" : "left-[18px]"}`} />
                </span>
                <span className={d.closed ? "text-ink-soft" : "text-emerald-600 dark:text-emerald-400"}>{d.closed ? t("dayOff") : t("openLabel")}</span>
              </button>
              <div className={`flex items-center gap-2 ${d.closed ? "pointer-events-none opacity-30" : ""}`}>
                <input type="time" value={d.open} aria-label={`${t(code)} ${t("openTime")}`} onChange={(e) => set(code, { open: e.target.value }, false)} onBlur={() => apply(week)} className="nz-glass-input rounded-lg px-2 py-1.5 text-sm tabular-nums" />
                <span className="text-ink-soft">—</span>
                <input type="time" value={d.close} aria-label={`${t(code)} ${t("closeTime")}`} onChange={(e) => set(code, { close: e.target.value }, false)} onBlur={() => apply(week)} className="nz-glass-input rounded-lg px-2 py-1.5 text-sm tabular-nums" />
              </div>
              <span className={`ml-auto text-xs font-medium ${bad ? "text-red-500" : "text-ink-soft"}`}>
                {bad ? t("hoursInvalid") : d.closed ? t("dayOff") : len !== null ? `${Math.floor(len / 60)} ${t("hoursUnit")}${len % 60 ? ` ${len % 60} min` : ""}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
