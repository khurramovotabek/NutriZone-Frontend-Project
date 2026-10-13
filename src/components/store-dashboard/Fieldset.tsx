import type { ReactNode } from "react";

/**
 * Semantic <fieldset>/<legend> wrapper used across the store
 * dashboard's forms (profile, contact & location, working hours,
 * products) so related inputs are grouped both visually and for
 * assistive technology, per the explicit product requirement.
 */
export function Fieldset({ legend, icon, children, className = "" }: { legend: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`rounded-xl border border-border px-4 pb-4 pt-1 sm:px-5 sm:pb-5 ${className}`}>
      <legend className="flex items-center gap-1.5 px-1.5 text-sm font-semibold text-ink">
        {icon}
        {legend}
      </legend>
      <div className="mt-3 space-y-4">{children}</div>
    </fieldset>
  );
}
