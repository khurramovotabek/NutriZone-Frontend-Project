"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { LoyaltyTier } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { formatPercent, formatSom } from "@/components/loyalty/format";
import { useBrand } from "@/components/BrandContext";

/**
 * The customer's membership card: a dark, tier-tinted card with a fine
 * guilloche pattern, a holographic sheen that follows the pointer and a
 * gentle 3D tilt (mouse only; disabled under prefers-reduced-motion by the
 * .nz-member-card CSS). Purely presentational -- every value comes from the
 * real /loyalty/me summary.
 */
export default function MembershipCard({ tier, balance, memberName, memberSince }: { tier: LoyaltyTier | null; balance: number; memberName: string; memberSince: string | null }) {
  const brand = useBrand();
  const t = useTranslations("loyalty.account");
  const ref = useRef<HTMLDivElement>(null);
  const color = tier?.color ?? "#d4a017";
  const since = memberSince ? new Date(memberSince) : null;
  const sinceLabel = since ? `${String(since.getMonth() + 1).padStart(2, "0")}/${String(since.getFullYear()).slice(-2)}` : "—";

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty("--rx", `${((0.5 - py) * 10).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${((px - 0.5) * 14).toFixed(2)}deg`);
    ref.current.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
    ref.current.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
  }

  function onLeave() {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  }

  return (
    <div className="nz-member-card-stage">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="nz-member-card relative aspect-[1.586] w-full overflow-hidden rounded-[28px] p-5 text-white sm:p-7"
        style={{ "--tier": color } as React.CSSProperties}
        role="group"
        aria-label={t("cardLabel", { tier: tier?.name ?? "—" })}
      >
        {/* tier-tinted lighting */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${color} 55%, transparent), transparent 55%), radial-gradient(90% 80% at 0% 100%, color-mix(in srgb, ${color} 30%, transparent), transparent 60%)` }} />
        {/* guilloche pattern */}
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[140%] w-[80%] opacity-[0.13]" viewBox="0 0 200 200">
          {Array.from({ length: 18 }, (_, i) => (
            <circle key={i} cx="100" cy="100" r={20 + i * 5} fill="none" stroke="#fff" strokeWidth="0.4" strokeDasharray={i % 2 ? "2 3" : undefined} />
          ))}
        </svg>
        {/* holographic sheen */}
        <div aria-hidden="true" className="nz-member-card-holo pointer-events-none absolute inset-0" />

        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-sm font-black ring-1 ring-white/25 backdrop-blur-sm">N</span>
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-wide">{brand.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">{t("cardProgram")}</p>
              </div>
            </div>
            {tier && <TierBadge icon={tier.icon} color={tier.color} size={62} className="-mr-1 -mt-1 drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]" title={tier.name} />}
          </div>

          <div className="mt-auto">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">{t("cardBalance")}</p>
            <p className="mt-1 flex items-center gap-2.5">
              <CoinIcon size={34} className="shrink-0 drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]" />
              <span className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-[2.6rem]">{formatSom(balance)}</span>
            </p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 sm:mt-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-white/90">{memberName || t("cardMember")}</p>
              <p className="mt-0.5 text-[11px] text-white/55 tabular-nums">{t("cardSince", { date: sinceLabel })}</p>
            </div>
            {tier && (
              <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm" style={{ background: `color-mix(in srgb, ${color} 28%, rgba(255,255,255,0.08))`, border: `1px solid color-mix(in srgb, ${color} 60%, transparent)` }}>
                {tier.name} · {formatPercent(tier.percent)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
