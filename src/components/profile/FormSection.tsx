import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A titled glass card grouping related profile fields. `@container` lets field grids respond to the card's own width, not the viewport's. */
export function FormSection({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="nz-glass @container overflow-hidden rounded-3xl">
      <header className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
        </div>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/** Label + control + optional helper line. `aside` sits right of the label (e.g. a character counter). */
export function Field({ id, label, hint, aside, children, className = "" }: { id: string; label: string; hint?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink-muted">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export const PROFILE_INPUT_CLASS = "nz-glass-input w-full rounded-xl px-4 py-3 text-[15px] disabled:cursor-not-allowed disabled:opacity-60";
