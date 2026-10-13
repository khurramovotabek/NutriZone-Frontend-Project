"use client";

import { Check, Dumbbell, Flame, Leaf, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export const GOAL_OPTIONS = ["muscle_gain", "fat_loss", "healthy_lifestyle"] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];

const GOAL_ICONS: Record<Goal, LucideIcon> = { muscle_gain: Dumbbell, fat_loss: Flame, healthy_lifestyle: Leaf };

/** Fitness goal as selectable tiles (a radio group). Clicking the selected tile again clears the goal. */
export default function GoalPicker({ id, value, onChange, disabled }: { id: string; value: string | null; onChange: (goal: Goal | null) => void; disabled?: boolean }) {
  const t = useTranslations("profile");

  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-2.5 @md:grid-cols-3">
      {GOAL_OPTIONS.map((goal, i) => {
        const Icon = GOAL_ICONS[goal];
        const selected = value === goal;
        return (
          <button
            key={goal}
            // The first tile carries the id so "jump to field" and the label can target the group.
            id={i === 0 ? id : undefined}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : goal)}
            className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 @md:flex-col @md:items-start @md:gap-2.5 ${
              selected ? "border-primary bg-primary-soft shadow-[0_10px_26px_-14px_rgba(var(--nz-primary-rgb),0.6)]" : "border-border bg-surface/40 hover:-translate-y-0.5 hover:border-border-hover"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected ? "nz-cta" : "bg-surface-2 text-ink-muted"}`}>
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 pr-6">
              <span className={`block text-sm font-semibold ${selected ? "text-primary" : "text-ink"}`}>{t(`goalOptions.${goal}`)}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">{t(`goalHints.${goal}`)}</span>
            </span>
            <span
              aria-hidden="true"
              className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${selected ? "border-primary bg-primary text-white" : "border-border-hover"}`}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
