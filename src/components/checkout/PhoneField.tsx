"use client";

import { Phone } from "lucide-react";
import { formatLocal, localDigits } from "@/lib/phone";

/**
 * Phone input that takes the number in any shape (typed or pasted: "+998942052040", "94-205-20-40", "8 94 ...") and
 * shows it as "+998 | 94 205 20 40". `value` / `onChange` carry the 9 local digits.
 */
export default function PhoneField({ id, value, onChange, invalid, disabled, autoFocus }: {
  id: string; value: string; onChange: (digits: string) => void; invalid?: boolean; disabled?: boolean; autoFocus?: boolean;
}) {
  return (
    <div className={`nz-glass-input flex w-full min-w-0 items-center gap-2 rounded-xl px-3.5 ${invalid ? "!border-red-500/70 ring-1 ring-red-500/30" : ""}`}>
      <Phone className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink-muted">+998</span>
      <input
        id={id} type="tel" inputMode="tel" autoComplete="tel-national" value={formatLocal(value)} disabled={disabled} autoFocus={autoFocus}
        onChange={(e) => onChange(localDigits(e.target.value))} placeholder="94 205 20 40"
        className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-semibold tabular-nums tracking-wide text-ink outline-none placeholder:font-normal placeholder:text-ink-soft"
      />
    </div>
  );
}
