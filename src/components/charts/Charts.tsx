"use client";

/**
 * Lightweight, dependency-free SVG chart primitives for the premium
 * liquid-glass dashboards (store owner + customer account).
 *
 * Deliberately NOT built on a charting library: the storefront has
 * zero chart dependencies today (see package.json), and every chart
 * on these dashboards is simple enough (a donut, a horizontal bar
 * list, a trend line, a KPI stat) that hand-rolled, theme-aware SVG
 * keeps the bundle small, matches the glass aesthetic exactly (real
 * CSS custom properties, not a library's own palette), and never
 * fights dark-mode/RTL since it's just our own markup.
 *
 * Every chart also renders a visually-hidden (`sr-only`) data table
 * or list alongside the SVG, so the underlying numbers are always
 * available to screen readers and never locked inside a canvas/SVG
 * that assistive tech can't parse.
 */

import type { ReactNode } from "react";

const PALETTE = ["var(--nz-primary)", "var(--nz-info)", "var(--nz-warning)", "var(--nz-danger)", "var(--nz-primary-hover)"] as const;

export function chartColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/* ------------------------------------------------------------------ */
/* StatCard -- a single premium KPI tile                              */
/* ------------------------------------------------------------------ */

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "info" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    info: "bg-info/14 text-info",
    warning: "bg-warning/14 text-warning",
    danger: "bg-danger/14 text-danger",
  }[tone];

  return (
    <div className="nz-glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tabular-nums text-ink">{value}</p>
          <p className="truncate text-xs font-medium text-ink-soft">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DonutChart                                                          */
/* ------------------------------------------------------------------ */

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  segments,
  size = 148,
  thickness = 16,
  centerLabel,
  centerValue,
  emptyLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;

  const isEmpty = total <= 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" role="img" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--nz-border)" strokeWidth={thickness} />
          {!isEmpty &&
            segments.map((seg, i) => {
              if (seg.value <= 0) return null;
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const offset = -cursor * circumference;
              cursor += fraction;
              return (
                <circle
                  key={seg.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={seg.color ?? chartColor(i)}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-ink">{centerValue ?? (isEmpty ? "—" : `${Math.round((segments[0]?.value ?? 0) / total * 100)}%`)}</span>
          {centerLabel && <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{centerLabel}</span>}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {isEmpty && emptyLabel && <p className="text-xs text-ink-muted">{emptyLabel}</p>}
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color ?? chartColor(i) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{seg.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BarList -- horizontal bar chart, one row per item                  */
/* ------------------------------------------------------------------ */

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  displayValue?: string;
}

export function BarList({ items, max }: { items: BarItem[]; max?: number }) {
  const computedMax = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.min(100, (item.value / computedMax) * 100);
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium text-ink-muted">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{item.displayValue ?? item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${item.label}: ${item.displayValue ?? item.value}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color ?? chartColor(i) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TrendLine -- a small responsive line/area chart for time series    */
/* ------------------------------------------------------------------ */

export function TrendLine({
  points,
  labels,
  height = 120,
  formatValue,
  color = "var(--nz-primary)",
}: {
  points: number[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => string;
  color?: string;
}) {
  const width = 300;
  const padding = 8;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = coords.length > 0 ? `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height - padding} L${coords[0][0].toFixed(1)},${height - padding} Z` : "";

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-hidden="true">
        {areaPath && <path d={areaPath} fill={color} opacity={0.12} />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-ink-soft">
        {labels.map((l, i) => (
          <span key={i} className={i !== 0 && i !== labels.length - 1 ? "hidden sm:inline" : ""}>
            {l}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Trend data</caption>
        <tbody>
          {points.map((v, i) => (
            <tr key={i}>
              <th scope="row">{labels[i]}</th>
              <td>{formatValue ? formatValue(v) : v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
