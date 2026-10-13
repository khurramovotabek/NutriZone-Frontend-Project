"use client";

import { AtSign, BadgeCheck, Camera, ChevronRight, LoaderCircle, Mail, Package, Phone, User } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LoyaltySummary } from "@/lib/loyalty-api";
import CoinIcon from "@/components/loyalty/CoinIcon";
import TierBadge from "@/components/loyalty/TierBadge";
import { formatPercent, formatSom } from "@/components/loyalty/format";
import { formatDate } from "@/lib/dates";

const FALLBACK_ACCENT = "#3b82f6";

export const AVATAR_INPUT_ID = "avatar-upload";

interface Props {
  fullName: string;
  username: string | null;
  email: string | null;
  phone: string;
  avatarUrl: string | null;
  verified: boolean;
  loyalty: LoyaltySummary | null;
  avatarUploading: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Identity banner for the profile page: avatar (with upload), name, contact chips, loyalty tier and headline stats. Tinted with the member's tier colour. */
export default function ProfileHero({ fullName, username, email, phone, avatarUrl, verified, loyalty, avatarUploading, onAvatarChange }: Props) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const tier = loyalty?.current_tier ?? null;
  const accent = tier?.color || FALLBACK_ACCENT;
  const memberSince = loyalty?.member_since ? formatDate(loyalty.member_since, locale, "monthYear") : null;

  return (
    <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl" style={{ "--accent": accent } as React.CSSProperties}>
      {/* Ambient tier-tinted backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_100%_100%,rgba(var(--nz-primary-rgb),0.14),transparent_65%)]" />
        <div className="nz-orb -right-16 -top-20 h-56 w-56 bg-[color-mix(in_srgb,var(--accent)_35%,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent)_60%,transparent)] to-transparent" />
      </div>

      <div className="relative p-5 sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          {/* Avatar with gradient ring and upload affordance */}
          <div className="relative shrink-0">
            <div className="rounded-full bg-[conic-gradient(from_200deg,var(--accent),rgba(var(--nz-primary-rgb),0.9),var(--accent))] p-[3px] shadow-[0_18px_40px_-18px_var(--accent)]">
              <div className="rounded-full bg-surface p-[3px]">
                <label htmlFor={AVATAR_INPUT_ID} className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-surface-2 sm:h-28 sm:w-28">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend media domain isn't configured in next.config.ts's images.remotePatterns.
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <User className="h-11 w-11 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-[11px] font-semibold text-white backdrop-blur-[2px] transition-opacity ${
                      avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    }`}
                  >
                    {avatarUploading ? <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Camera className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
                    {avatarUploading ? t("uploading") : t("changePhoto")}
                  </span>
                  <input id={AVATAR_INPUT_ID} type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} disabled={avatarUploading} className="sr-only" />
                </label>
              </div>
            </div>
            <span aria-hidden="true" className="nz-cta pointer-events-none absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-surface sm:hidden">
              <Camera className="h-4 w-4" strokeWidth={2} />
            </span>
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{t("heroEyebrow")}</p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className={`truncate text-2xl font-bold tracking-tight sm:text-3xl ${fullName ? "text-ink" : "text-ink-soft"}`}>{fullName || t("noName")}</h1>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t("verified")}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {username && (
                <Chip icon={<AtSign className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}>{username}</Chip>
              )}
              <Chip icon={<Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}>{phone}</Chip>
              {email && <Chip icon={<Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}>{email}</Chip>}
            </div>
            {memberSince && <p className="mt-3 text-xs text-ink-soft">{t("memberSince", { date: memberSince })}</p>}
          </div>

          {/* Tier */}
          {tier && (
            <Link
              href="/account/loyalty"
              className="group flex shrink-0 items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] py-2 pl-2 pr-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_var(--accent)]"
            >
              <TierBadge icon={tier.icon} color={tier.color} size={44} />
              <span className="text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{t("tierLink")}</span>
                <span className="block font-semibold text-ink">{tier.name}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </div>

        {loyalty && (
          <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-border/70 bg-surface/55 backdrop-blur-sm">
            <Stat label={t("statCoins")} icon={<CoinIcon size={18} />} value={formatSom(loyalty.balance)} />
            <Stat label={t("statOrders")} icon={<Package className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />} value={String(loyalty.order_count)} />
            <Stat label={t("statCashback")} icon={<span className="text-sm font-bold text-success">%</span>} value={tier ? `${formatPercent(tier.percent)}%` : "—"} />
          </dl>
        )}
      </div>
    </section>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-xs font-medium text-ink-muted">
      <span className="text-ink-soft">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Stat({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 border-l border-border/70 px-2 py-3.5 first:border-l-0 sm:items-start sm:px-5">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft sm:text-xs">
        <span className="hidden sm:inline-flex">{icon}</span>
        {label}
      </dt>
      <dd className="text-lg font-bold tabular-nums tracking-tight text-ink sm:text-xl">{value}</dd>
    </div>
  );
}
