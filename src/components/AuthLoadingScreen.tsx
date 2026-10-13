"use client";

import { AlertTriangle, Check } from "lucide-react";
import { useBrand } from "@/components/BrandContext";

export type AuthLoadingPhase = "loading" | "success" | "error";

type AuthLoadingScreenProps = {
  /**
   * Reflects real authentication state only -- the caller sets
   * "success"/"error" from an actual API response, never from a timer.
   * This component owns no auth logic and fires no requests itself.
   */
  phase: AuthLoadingPhase;
  title: string;
  subtitle: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Full-screen branded authentication transition, reused by both the
 * Telegram code login (LoginCodeForm) and Telegram auto-login
 * (/auto-login) flows -- replaces the previous generic spinner +
 * plain text with the same premium "liquid glass" dark treatment
 * already used on /login (ambient glow, .nz-glass-strong, --nz-primary),
 * never a second, unrelated visual language.
 */
export default function AuthLoadingScreen({ phase, title, subtitle, onRetry, retryLabel }: AuthLoadingScreenProps) {
  const brand = useBrand();
  return (
    <div className="nz-auth-screen-in dark fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-bg px-4">
      {/* Same ambient glow recipe as /login -- visual continuity between the login card and this transition, never a jarring style switch. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-success/[0.06] blur-[100px]" />
      </div>

      <div className="nz-glass-strong relative flex w-full max-w-xs flex-col items-center rounded-3xl px-6 py-10 text-center">
        <p className="text-lg font-bold tracking-tight text-primary">{brand.name}</p>

        <div className="mt-8 flex h-20 w-20 items-center justify-center">
          {phase === "error" ? (
            <AlertTriangle className="h-9 w-9 text-danger" strokeWidth={1.5} aria-hidden="true" />
          ) : phase === "success" ? (
            <div className="nz-auth-mark-success flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="nz-auth-check h-8 w-8 text-success" strokeWidth={2.25} aria-hidden="true" />
            </div>
          ) : (
            <div className="nz-auth-orbit nz-auth-mark-breathe flex h-16 w-16 items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        <div aria-live="polite" role={phase === "error" ? "alert" : "status"}>
          <h1 className="mt-6 text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
        </div>

        {phase === "error" && onRetry && (
          <button type="button" onClick={onRetry} className="nz-cta nz-shimmer-btn mt-6 rounded-xl px-6 py-3 text-sm font-bold">
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
