"use client";

import { ChevronDown, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const BUTTON_VARIANTS = {
  primary: "nz-cta nz-shimmer-btn disabled:opacity-50",
  secondary:
    "nz-glass text-ink hover:border-primary hover:text-primary hover:shadow-[0_4px_20px_-4px_rgba(var(--nz-primary-rgb),0.28)]",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  destructive:
    "bg-gradient-to-br from-red-600 to-red-500 text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] hover:shadow-[0_10px_26px_-8px_rgba(220,38,38,0.5)] hover:brightness-105 disabled:from-red-600/50 disabled:to-red-600/50 disabled:shadow-none",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:hover:translate-y-0 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`nz-glass rounded-2xl p-4 ${className}`} {...props} />;
}

/**
 * Every native `<select>` in the app used to render with the browser's
 * own default appearance (a plain OS dropdown arrow, no theme, no
 * hover/focus treatment matching `.nz-glass-input`) -- `globals.css`
 * never targeted `select` at all, so it was the one form control that
 * looked out of place next to every input/button around it. This wraps
 * the real native element (kept for its built-in keyboard/a11y/mobile
 * picker behavior -- never reimplemented as a custom listbox) and
 * hides its default arrow in favor of one consistent `ChevronDown`,
 * matching every other dropdown affordance in the design system.
 * `wrapperClassName` covers layout (e.g. `w-full` vs an inline
 * `shrink-0`); `className` covers the select's own sizing/padding --
 * callers must leave room on the right for the icon (e.g. `pr-9`).
 */
export function Select({ className = "", wrapperClassName = "", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select className={`nz-glass-input w-full appearance-none disabled:opacity-50 ${className}`} {...props} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

const BADGE_TONES = {
  neutral: "border-border bg-surface-2 text-ink-muted",
  pending: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  success: "border-success/25 bg-success/12 text-success",
  error: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-3 ${className}`} />;
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="nz-liquid nz-state relative mx-auto my-6 max-w-lg overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-10">
      {icon && <div className="nz-liquid-icon mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl [&_svg]:h-7 [&_svg]:w-7">{icon}</div>}
      <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, message, action }: { title?: string; message?: string; action?: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div role="alert" className="nz-liquid nz-state nz-state-error relative mx-auto my-6 max-w-lg overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-10">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:text-rose-400">
        <TriangleAlert className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-ink">{title ?? t("errorTitle")}</h2>
      {message && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
