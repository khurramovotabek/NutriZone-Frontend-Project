"use client";

import { Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import ProgressRing from "@/components/loyalty/ProgressRing";

export interface CompletenessItem {
  /** Element id to focus when the chip is clicked. */
  targetId: string;
  label: string;
  done: boolean;
}

/** Ring showing how much of the profile is filled in, with one-click chips that jump to each missing field. */
export default function ProfileCompleteness({ items }: { items: CompletenessItem[] }) {
  const t = useTranslations("profile");
  const done = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 100;
  const missing = items.filter((i) => !i.done);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // File inputs are visually hidden -- open the picker instead of focusing.
    if (el instanceof HTMLInputElement && el.type === "file") el.click();
    else el.focus({ preventScroll: true });
  }

  return (
    <section className="nz-glass rounded-3xl p-5">
      <h2 className="text-sm font-semibold text-ink">{t("completenessTitle")}</h2>
      <div className="mt-4 flex items-center gap-4">
        <ProgressRing value={percent} from="#3b82f6" to="#22c55e" size={92} stroke={9}>
          <span className="text-xl font-bold tabular-nums text-ink">{percent}%</span>
        </ProgressRing>
        <p className="text-sm text-ink-muted">
          {missing.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("completenessDone")}
            </span>
          ) : (
            t("completenessHint")
          )}
        </p>
      </div>
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-soft">{t("completenessMissing")}</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((item) => (
              <button
                key={item.targetId}
                type="button"
                onClick={() => jumpTo(item.targetId)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-hover px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
              >
                <Plus className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
