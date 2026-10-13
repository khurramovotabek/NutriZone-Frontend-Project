"use client";

import { useState } from "react";
import { Phone, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

/** "90 123 45 67", "998901234567", "+998 (90) 123-45-67" -> "+998901234567"; null when it isn't an Uzbek number. */
export function normalizeUzPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 9) d = `998${d}`;
  return /^998\d{9}$/.test(d) ? `+${d}` : null;
}

/** One input per phone number (the first is the main one); saved as the list the API expects, never comma text. */
export default function PhoneListEditor({ value, onSave }: { value: string[]; onSave: (phones: string[]) => void }) {
  const t = useTranslations("myStore");
  const [rows, setRows] = useState<string[]>(value.length ? value : [""]);
  const [error, setError] = useState<string | null>(null);

  function commit(next: string[]) {
    const cleaned: string[] = [];
    for (const r of next) {
      if (!r.trim()) continue;
      const n = normalizeUzPhone(r);
      if (!n) {
        setError(t("phoneInvalid", { phone: r }));
        return;
      }
      if (!cleaned.includes(n)) cleaned.push(n);
    }
    setError(null);
    setRows(cleaned.length ? cleaned : [""]);
    if (cleaned.join() !== value.join()) onSave(cleaned);
  }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
            <Phone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={r}
            placeholder="+998 90 123 45 67"
            onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            onBlur={() => commit(rows)}
            className="nz-glass-input w-full rounded-xl px-3 py-2.5 text-base tabular-nums sm:text-sm"
            aria-label={i === 0 ? t("phoneMain") : t("phoneExtra")}
          />
          {rows.length > 1 && (
            <button type="button" onClick={() => commit(rows.filter((_, j) => j !== i))} aria-label={t("phoneRemove")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-500/10 hover:text-red-500">
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => setRows((prev) => [...prev, ""])} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        {t("phoneAdd")}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
