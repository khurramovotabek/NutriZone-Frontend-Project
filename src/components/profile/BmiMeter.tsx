"use client";

import { useTranslations } from "next-intl";

// Scale shown on the bar; WHO adult cut-offs at 18.5 / 25 / 30.
const SCALE_MIN = 15;
const SCALE_MAX = 40;
const BANDS = [
  { key: "under", upTo: 18.5, color: "#38bdf8" },
  { key: "normal", upTo: 25, color: "#22c55e" },
  { key: "over", upTo: 30, color: "#f59e0b" },
  { key: "obese", upTo: SCALE_MAX, color: "#ef4444" },
] as const;

export function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm < 30 || weightKg < 10) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

const pos = (v: number) => ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

/** Live BMI readout with a banded scale; purely informational, derived from the height/weight being edited. */
export default function BmiMeter({ heightCm, weightKg }: { heightCm: number | null; weightKg: number | null }) {
  const t = useTranslations("profile");
  const bmi = computeBmi(heightCm, weightKg);
  const band = bmi === null ? null : (BANDS.find((b) => bmi < b.upTo) ?? BANDS[BANDS.length - 1]);

  return (
    <div className="rounded-2xl border border-border/70 bg-surface-2/50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{t("bmi")}</p>
        {bmi !== null && band && (
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-ink">{bmi}</span>
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: band.color, backgroundColor: `${band.color}1f` }}>
              {t(`bmiCategories.${band.key}`)}
            </span>
          </p>
        )}
      </div>

      <div className="relative mt-4 pb-5">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {BANDS.map((b, i) => {
            const from = i === 0 ? SCALE_MIN : BANDS[i - 1].upTo;
            return <div key={b.key} style={{ width: `${pos(b.upTo) - pos(from)}%`, backgroundColor: b.color, opacity: band && band.key !== b.key ? 0.35 : 0.9 }} />;
          })}
        </div>
        {bmi !== null && band && (
          <span
            aria-hidden="true"
            className="absolute top-[-5px] h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-surface shadow-md transition-[left] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ left: `${pos(bmi)}%`, backgroundColor: band.color }}
          />
        )}
        {[18.5, 25, 30].map((v) => (
          <span key={v} className="absolute top-4 -translate-x-1/2 text-[10px] tabular-nums text-ink-soft" style={{ left: `${pos(v)}%` }}>
            {v}
          </span>
        ))}
      </div>

      {bmi === null && <p className="text-xs text-ink-soft">{t("bmiEmpty")}</p>}
    </div>
  );
}
