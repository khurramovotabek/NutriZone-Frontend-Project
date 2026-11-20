"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, LoaderCircle, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";
import type { PriceHistory } from "@/lib/pdp-api";

const W = 300;
const H = 72;

/**
 * Narx tarixi + "Narx tushsa xabar bering": the selected variant's shop price over the last 6 months (the store's own
 * price-change journal) as a step sparkline, with min / max and a "lowest in 90 days" badge; a signed-in shopper can
 * watch the price and gets one notification (site + Telegram) per drop. The parent keys it by variant, so switching
 * the size / flavour starts from that variant's own watch state.
 */
export default function PriceInsight({ history, variantId, currency, watching, signedIn }: {
  history: PriceHistory | undefined;
  variantId: string | null;
  currency: string | null;
  watching: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations("product");
  const router = useRouter();
  const gradientId = useId();
  const [on, setOn] = useState(watching);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const path = useMemo(() => {
    if (!history || history.points.length < 2) return null;
    const pts = history.points.map(([d, v]) => [Date.parse(`${d}T00:00:00Z`), Number(v)] as const);
    const x0 = pts[0][0];
    const x1 = Math.max(pts[pts.length - 1][0], x0 + 1);
    const lo = Math.min(...pts.map((p) => p[1]));
    const hi = Math.max(...pts.map((p) => p[1]));
    const span = hi - lo || hi * 0.1 || 1;
    const x = (v: number) => ((v - x0) / (x1 - x0)) * W;
    const y = (v: number) => (hi === lo ? H / 2 : H - 8 - ((v - lo) / span) * (H - 20)); // a flat price sits mid-height
    // a price holds until it changes: draw steps, not slopes
    let d = `M ${x(pts[0][0]).toFixed(1)} ${y(pts[0][1]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` H ${x(pts[i][0]).toFixed(1)} V ${y(pts[i][1]).toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    return { line: d, area: `${d} H ${W} V ${H} H 0 Z`, endX: x(last[0]), endY: y(last[1]) };
  }, [history]);

  async function toggle() {
    if (!variantId || busy) return;
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/products/price-watch/${variantId}`, { method: on ? "DELETE" : "POST" }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (res?.ok) setOn(!on);
    else setError(true);
  }

  if (!variantId || !history) return null;
  const flat = history.min === history.max;

  return (
    <section className="nz-liquid rounded-3xl p-4 sm:p-5" aria-labelledby={`${gradientId}-t`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={`${gradientId}-t`} className="text-[15px] font-bold text-ink">{t("priceHistoryTitle")}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">{flat ? t("priceHistoryStable") : t("priceHistoryRange", { min: formatPrice(history.min, currency) ?? "", max: formatPrice(history.max, currency) ?? "" })}</p>
        </div>
        {history.lowest_90d && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" /> {t("priceLowest90")}
          </span>
        )}
      </div>

      {path && (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[72px] w-full overflow-visible text-primary" preserveAspectRatio="none" role="img" aria-label={t("priceHistoryAria", { min: formatPrice(history.min, currency) ?? "", max: formatPrice(history.max, currency) ?? "" })}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#${gradientId})`} />
          <path d={path.line} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={path.endX} cy={path.endY} r="4" fill="currentColor" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-ink-soft">
        <span>{t("priceHistoryFrom")}</span>
        <span>{t("priceHistoryToday")}</span>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
          on ? "bg-primary text-white shadow-sm shadow-primary/30" : "border border-primary/30 bg-primary-soft text-primary hover:bg-primary hover:text-white"
        }`}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : on ? <BellRing className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
        {on ? t("priceWatchOn") : t("priceWatchOff")}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-ink-soft" role={error ? "alert" : undefined}>{error ? t("priceWatchError") : on ? t("priceWatchOnHint") : t("priceWatchHint")}</p>
    </section>
  );
}
