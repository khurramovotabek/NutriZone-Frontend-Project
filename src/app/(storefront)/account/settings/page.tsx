"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, ExternalLink, Globe, Laptop, LifeBuoy, LoaderCircle, LogOut, Monitor, Moon, Palette, Send, Shield, ShieldCheck, Smartphone, Sun, User, Volume2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import { useIsClient } from "@/hooks/useIsClient";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { setChatSoundEnabled, useChatSoundEnabled } from "@/lib/chat-sound";
import type { UserSession } from "@/lib/sessions-api";

const LOCALE_FLAGS: Record<Locale, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };
const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
const VISIBLE_SESSIONS_LIMIT = 3;

interface ProfileSummary {
  full_name: string;
  phone_number: string;
  avatar_url: string | null;
  telegram_connected?: boolean;
}

type PrefType = "transactional" | "promotional";
interface PrefEntry {
  channel: string;
  notification_type: string;
  enabled: boolean;
}

/** "5 daqiqa oldin" etc. -- pure, called with the time captured at render. */
function relativeTime(iso: string, now: number, t: ReturnType<typeof useTranslations<"accountSettings">>): string {
  const diff = Math.max(0, now - new Date(iso).getTime()) / 60000;
  if (diff < 1) return t("justNow");
  if (diff < 60) return t("minutesAgo", { count: Math.floor(diff) });
  if (diff < 60 * 24) return t("hoursAgo", { count: Math.floor(diff / 60) });
  return t("daysAgo", { count: Math.floor(diff / 1440) });
}

function nowMs(): number {
  return Date.now();
}

export default function AccountSettingsPage() {
  const t = useTranslations("accountSettings");
  const tLang = useTranslations("language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const chatSound = useChatSoundEnabled();

  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [prefs, setPrefs] = useState<PrefEntry[] | null>(null);
  const [prefSaving, setPrefSaving] = useState<PrefType | null>(null);
  const [prefError, setPrefError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  // The locale last confirmed synced to the backend; "syncing" is derived
  // from it lagging behind the current UI locale.
  const [syncedLocale, setSyncedLocale] = useState<string | null>(null);
  const syncingLanguage = syncedLocale !== locale;
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    fetch("/api/account/sessions")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) {
          setError(res.status === 401 ? "login" : "load");
          return;
        }
        setSessions(body.data);
      })
      .catch(() => setError("network"))
      .finally(() => setLoading(false));

    // Header summary and notification toggles -- each optional, never blocks the page.
    fetch("/api/profile")
      .then((res) => res.json())
      .then((body) => body?.success && setProfile(body.data))
      .catch(() => {});
    fetch("/api/notifications/preferences")
      .then((res) => res.json())
      .then((body) => body?.success && setPrefs(body.data.entries))
      .catch(() => {});
  }, []);

  // Keep the notification-language preference on the backend in sync
  // with the UI locale cookie -- best-effort, never blocks the page.
  useEffect(() => {
    fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: locale }) })
      .catch(() => {})
      .finally(() => setSyncedLocale(locale));
  }, [locale]);

  function selectLocale(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  function telegramEnabled(type: PrefType): boolean {
    return prefs?.find((p) => p.channel === "telegram" && p.notification_type === type)?.enabled ?? true;
  }

  async function togglePref(type: PrefType) {
    if (prefSaving) return;
    const enabled = !telegramEnabled(type);
    setPrefSaving(type);
    setPrefError(false);
    // Optimistic; rolled back below if the save fails.
    setPrefs((prev) => (prev ?? []).filter((p) => !(p.channel === "telegram" && p.notification_type === type)).concat({ channel: "telegram", notification_type: type, enabled }));
    try {
      const res = await fetch("/api/notifications/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "telegram", notification_type: type, enabled }) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error("save failed");
      setPrefs(body.data.entries);
    } catch {
      setPrefError(true);
      setPrefs((prev) => (prev ?? []).filter((p) => !(p.channel === "telegram" && p.notification_type === type)).concat({ channel: "telegram", notification_type: type, enabled: !enabled }));
    } finally {
      setPrefSaving(null);
    }
  }

  async function handleRevoke(sessionId: string) {
    if (revokingId) return;
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/account/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev?.filter((s) => s.id !== sessionId) ?? null);
      }
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
    }
  }

  async function handleLogoutAll() {
    if (loggingOutAll) return;
    setLoggingOutAll(true);
    try {
      await fetch("/api/account/logout-all", { method: "POST" });
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOutAll(false);
    }
  }

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
        <Skeleton className="mt-6 h-64 w-full rounded-3xl" />
      </AccountLayout>
    );
  }

  if (error) {
    return <ErrorState message={error === "login" ? t("loginPrompt") : t("loadError")} />;
  }

  const now = nowMs();
  const activeSessions = sessions ?? [];
  // resolvedTheme, not theme: with nothing stored yet, theme is "system" while the page may well be dark.
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
  const telegramConnected = profile?.telegram_connected ?? false;

  return (
    <AccountLayout>
      {/* Header */}
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[rgba(var(--nz-primary-rgb),0.2)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-surface-2">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- backend media domain isn't configured in next.config.ts's images.remotePatterns.
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">{t("subtitle")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusChip tone="success" icon={ShieldCheck} label={t("statusActive")} />
            {profile && <StatusChip tone={telegramConnected ? "info" : "warning"} icon={Send} label={telegramConnected ? t("telegramConnected") : t("telegramNotConnected")} />}
            <StatusChip tone="neutral" icon={Monitor} label={t("devicesCount", { count: activeSessions.length })} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Section icon={Palette} title={t("appearance")} description={t("appearanceDescription")}>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("appearance")}>
            {(["light", "dark"] as const).map((mode) => {
              const selected = isClient && currentTheme === mode;
              const Icon = mode === "light" ? Sun : Moon;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(mode)}
                  className={`group relative overflow-hidden rounded-2xl border p-2 text-left transition-all ${selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-border-hover"}`}
                >
                  {/* Mini preview of the theme */}
                  <span aria-hidden="true" className={`block h-16 rounded-xl p-2 ${mode === "light" ? "bg-[#f7faf8]" : "bg-[#0e1512]"}`}>
                    <span className={`block h-2 w-10 rounded-full ${mode === "light" ? "bg-[#dfe6e2]" : "bg-[#202b25]"}`} />
                    <span className="mt-2 flex gap-1.5">
                      <span className={`block h-6 flex-1 rounded-md ${mode === "light" ? "bg-white shadow-sm" : "bg-[#141d19]"}`} />
                      <span className={`block h-6 flex-1 rounded-md ${mode === "light" ? "bg-white shadow-sm" : "bg-[#141d19]"}`} />
                    </span>
                  </span>
                  <span className="mt-2 flex items-center justify-between px-1 pb-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.9} aria-hidden="true" />
                      {mode === "light" ? t("themeLight") : t("themeDark")}
                    </span>
                    {selected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Language */}
        <Section
          icon={Globe}
          title={t("language")}
          description={t("languageDescription")}
          aside={
            syncingLanguage ? (
              <span className="flex items-center gap-1 text-xs text-ink-soft">
                <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />
                {t("syncing")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                {t("languageSaved")}
              </span>
            )
          }
        >
          <div className="grid gap-2" role="radiogroup" aria-label={t("language")}>
            {SUPPORTED_LOCALES.map((code) => {
              const selected = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectLocale(code)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${selected ? "border-primary bg-primary-soft" : "border-border hover:border-border-hover hover:bg-surface-2/60"}`}
                >
                  <span className="text-xl leading-none" aria-hidden="true">
                    {LOCALE_FLAGS[code]}
                  </span>
                  <span className={`flex-1 text-sm font-semibold ${selected ? "text-primary" : "text-ink"}`}>{tLang(code)}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border-hover"}`}>
                    {selected && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Notifications */}
      <div className="mt-6">
        <Section icon={Bell} title={t("notifications")} description={t("notificationsDescription")}>
          <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${telegramConnected ? "border-info/25 bg-info/8" : "border-warning/30 bg-warning/8"}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${telegramConnected ? "bg-[#229ED9] text-white" : "bg-warning/15 text-warning"}`}>
              <Send className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div className="min-w-[11rem] flex-1">
              <p className="text-sm font-semibold text-ink">{telegramConnected ? t("telegramConnected") : t("telegramNotConnected")}</p>
              <p className="text-xs text-ink-muted">{telegramConnected ? t("telegramConnectedHint") : t("telegramNotConnectedHint")}</p>
            </div>
            {TELEGRAM_BOT && (
              <a
                href={`https://t.me/${TELEGRAM_BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                {t("connectTelegram")}
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </a>
            )}
          </div>

          <ul className="mt-4 divide-y divide-border/70">
            <ToggleRow
              title={t("prefOrders")}
              hint={t("prefOrdersHint")}
              checked={telegramEnabled("transactional")}
              busy={prefSaving === "transactional"}
              disabled={!prefs || !telegramConnected}
              onChange={() => togglePref("transactional")}
            />
            <ToggleRow
              title={t("prefPromos")}
              hint={t("prefPromosHint")}
              checked={telegramEnabled("promotional")}
              busy={prefSaving === "promotional"}
              disabled={!prefs || !telegramConnected}
              onChange={() => togglePref("promotional")}
            />
            <ToggleRow icon={Volume2} title={t("chatSound")} hint={t("chatSoundHint")} checked={chatSound} onChange={() => setChatSoundEnabled(!chatSound)} />
          </ul>
          {prefError && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {t("prefSaveError")}
            </p>
          )}
        </Section>
      </div>

      {/* Security */}
      <div className="mt-6">
        <Section icon={Shield} title={t("security")} description={t("securityDescription")}>
          {activeSessions.length > 0 ? (
            <ul className="space-y-2">
              {(showAllSessions ? activeSessions : activeSessions.slice(0, VISIBLE_SESSIONS_LIMIT)).map((s) => {
                const Icon = s.device_type === "mobile" ? Smartphone : Laptop;
                const confirming = confirmRevokeId === s.id;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-surface/40 p-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
                      <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{s.device_name ?? t("unknownDevice")}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {s.ip_address ?? t("unknownIp")} · {t("lastActive")} {relativeTime(s.last_activity, now, t)}
                      </p>
                    </div>
                    {s.is_active &&
                      (confirming ? (
                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                          <span className="mr-auto text-xs font-medium text-ink sm:mr-1">{t("revokeConfirm")}</span>
                          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setConfirmRevokeId(null)} disabled={revokingId === s.id}>
                            {t("cancel")}
                          </Button>
                          <Button type="button" variant="destructive" className="px-2.5 py-1.5 text-xs" onClick={() => handleRevoke(s.id)} disabled={revokingId === s.id}>
                            {revokingId === s.id ? t("revoking") : t("confirm")}
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(s.id)}
                          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          {t("revoke")}
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t("noSessions")}</p>
          )}
          {activeSessions.length > VISIBLE_SESSIONS_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllSessions((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-ink-muted transition-colors hover:text-primary"
            >
              {showAllSessions ? t("showFewerDevices") : t("showMoreDevices", { count: activeSessions.length - VISIBLE_SESSIONS_LIMIT })}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllSessions ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            {confirmLogoutAll ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium text-ink">{t("logoutAllConfirm")}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmLogoutAll(false)} disabled={loggingOutAll}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleLogoutAll} disabled={loggingOutAll}>
                    {loggingOutAll ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
                    {loggingOutAll ? t("loggingOutAll") : t("confirm")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t("logoutAll")}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{t("logoutAllDescription")}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setConfirmLogoutAll(true)} className="text-red-600 hover:!border-red-500 hover:!text-red-600 dark:text-red-400">
                  <LogOut className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  {t("logoutAll")}
                </Button>
              </div>
            )}
          </div>
        </Section>
      </div>

      <aside className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-border/70 bg-surface-2/40 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LifeBuoy className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t("helpTitle")}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{t("helpText")}</p>
        </div>
        <Link href="/account/chat">
          <Button variant="secondary">{t("helpCta")}</Button>
        </Link>
      </aside>
    </AccountLayout>
  );
}

function Section({ icon: Icon, title, description, aside, children }: { icon: LucideIcon; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="nz-glass h-full overflow-hidden rounded-3xl">
      <header className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        </div>
        {aside && <div className="shrink-0 pt-1">{aside}</div>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function StatusChip({ tone, icon: Icon, label }: { tone: "success" | "info" | "warning" | "neutral"; icon: LucideIcon; label: string }) {
  const cls = {
    success: "border-success/25 bg-success/10 text-success",
    info: "border-info/25 bg-info/10 text-info",
    warning: "border-warning/30 bg-warning/10 text-warning",
    neutral: "border-border/70 bg-surface/60 text-ink-muted",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}

function ToggleRow({ icon: Icon, title, hint, checked, busy = false, disabled = false, onChange }: { icon?: LucideIcon; title: string; hint: string; checked: boolean; busy?: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <li className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${disabled ? "text-ink-soft" : "text-ink"}`}>{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled || busy}
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-surface-3"
        }`}
      >
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}>
          {busy && <LoaderCircle className="h-3 w-3 animate-spin text-primary" aria-hidden="true" />}
        </span>
      </button>
    </li>
  );
}
