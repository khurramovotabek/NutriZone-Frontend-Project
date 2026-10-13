"use client";

import { useId, type ReactNode } from "react";

/** Circular progress (0–100) with a two-colour gradient stroke -- current tier colour → next tier colour. */
export default function ProgressRing({ value, from, to, size = 168, stroke = 12, children }: { value: number; from: string; to: string; size?: number; stroke?: number; children?: ReactNode }) {
  const gid = `nzr-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-3/70" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c.toFixed(2)}
          strokeDashoffset={(c * (1 - Math.max(pct, 1.5) / 100)).toFixed(2)}
          className="nz-ring-progress"
          style={{ filter: `drop-shadow(0 0 6px ${to}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
