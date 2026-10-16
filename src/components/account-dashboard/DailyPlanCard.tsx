"use client";

import { ChevronRight, Droplets, Dumbbell, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { openAssistant } from "@/lib/assistant-events";

/** Same formulas as the advisor's apps/assistant/infrastructure/advisor/needs.py (Mifflin-St Jeor, medium activity). */
const PROTEIN_G_PER_KG: Record<string, [number, number]> = { muscle_gain: [1.8, 2.2], fat_loss: [2.0, 2.4], healthy_lifestyle: [1.2, 1.6] };
const CALORIE_SHIFT: Record<string, number> = { muscle_gain: 1.1, fat_loss: 0.8, healthy_lifestyle: 1.0 };

export function ageFrom(birthday: string | null): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  const age = now.getFullYear() - b.getFullYear() - (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()) ? 1 : 0);
  return age >= 10 && age <= 100 ? age : null;
}

export function dailyNeeds(heightCm: number, weightKg: number, age: number, goal: string) {
  const tdee = (10 * weightKg + 6.25 * heightCm - 5 * age + 5) * 1.55;
  const [lo, hi] = PROTEIN_G_PER_KG[goal] ?? [1.4, 1.8];
  return {
    calories: Math.round((tdee * (CALORIE_SHIFT[goal] ?? 1)) / 10) * 10,
    proteinLow: Math.round(weightKg * lo),
    proteinHigh: Math.round(weightKg * hi),
    water: Math.round(weightKg * 0.035 * 10) / 10,
  };
}

interface Props {
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  birthday: string | null;
}

/**
 * The customer's daily plan from their own profile (height, weight, age, goal) with a one-tap "pick me a stack"
 * that opens the free advisor with the question already asked. Missing data → a prompt to fill the profile.
 */
export default function DailyPlanCard({ heightCm, weightKg, goal, birthday }: Props) {
  const t = useTranslations("account.dashboardPage.plan");
  const age = ageFrom(birthday);
  const ready = heightCm && weightKg && goal && age;
  const n = ready ? dailyNeeds(heightCm, weightKg, age, goal) : null;

  return (
    <section className="nz-glass relative overflow-hidden rounded-3xl p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--nz-success)_22%,transparent)] blur-2xl" />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/14 text-success">
          <Sparkles className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
        {goal && <span className="ml-auto rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary">{t(`goal.${goal}` as "goal.muscle_gain")}</span>}
      </div>
      {n ? (
        <>
          <dl className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            <Metric icon={<Flame className="h-4 w-4" aria-hidden="true" />} value={n.calories.toLocaleString("ru-RU")} label={t("kcal")} />
            <Metric icon={<Dumbbell className="h-4 w-4" aria-hidden="true" />} value={`${n.proteinLow}–${n.proteinHigh}`} label={t("protein")} />
            <Metric icon={<Droplets className="h-4 w-4" aria-hidden="true" />} value={String(n.water)} label={t("water")} />
          </dl>
          <button
            type="button"
            onClick={() => openAssistant(t("ask"))}
            className="nz-cta relative mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("cta")}
          </button>
          <p className="relative mt-2 text-[11px] text-ink-soft">{t("note")}</p>
        </>
      ) : (
        <Link href="/profile" className="group relative mt-3 flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <span className="flex-1">{t("fill")}</span>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/70 px-2 py-3">
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <dd className="mt-1.5 text-base font-bold tabular-nums text-ink">{value}</dd>
      <dt className="text-[11px] text-ink-muted">{label}</dt>
    </div>
  );
}
