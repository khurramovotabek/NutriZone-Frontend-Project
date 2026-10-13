"use client";

import { useEffect, useState } from "react";
import { Activity, ChevronRight, CircleCheck, FileText, Lock, MapPin, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import MyStoreSummaryCard from "@/components/MyStoreSummaryCard";
import BmiMeter from "@/components/profile/BmiMeter";
import { Field, FormSection, PROFILE_INPUT_CLASS } from "@/components/profile/FormSection";
import GoalPicker from "@/components/profile/GoalPicker";
import ProfileCompleteness from "@/components/profile/ProfileCompleteness";
import ProfileHero, { AVATAR_INPUT_ID } from "@/components/profile/ProfileHero";
import { formatDate } from "@/lib/dates";
import type { LoyaltySummary } from "@/lib/loyalty-api";

interface Profile {
  full_name: string;
  username: string | null;
  email: string | null;
  phone_number: string;
  bio: string | null;
  birthday: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  language: string;
  status: string;
}

/** Fields the form edits (and PATCHes); anything else on Profile is read-only here. */
const EDITABLE_FIELDS = ["full_name", "username", "email", "bio", "birthday", "height_cm", "weight_kg", "goal"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const BIO_MAX = 2000;
const SAVED_TOAST_MS = 3000;

function pickEditable(p: Profile): Pick<Profile, EditableField> {
  return Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, p[k]])) as Pick<Profile, EditableField>;
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const locale = useLocale();
  // `saved` is the last server copy; `draft` is what the form shows. Dirty = they differ.
  const [saved, setSaved] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) {
          setError(res.status === 401 ? "login" : "load");
          return;
        }
        setSaved(body.data);
        setDraft(body.data);
      })
      .catch(() => setError("network"))
      .finally(() => setLoading(false));

    // Bonus context for the hero (tier, coins, orders) -- never blocks the page.
    fetch("/api/loyalty/me")
      .then((res) => res.json())
      .then((body) => {
        if (body?.success) setLoyalty(body.data);
      })
      .catch(() => {});
  }, []);

  function update<K extends EditableField>(key: K, value: Profile[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setShowSavedToast(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !saved) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setAvatarError(body.error?.message ?? t("avatarError"));
        return;
      }
      // The avatar saves immediately and isn't part of the form's dirty state.
      const avatar_url = body.data.profile.avatar_url;
      setSaved((prev) => (prev ? { ...prev, avatar_url } : prev));
      setDraft((prev) => (prev ? { ...prev, avatar_url } : prev));
    } catch {
      setAvatarError(t("networkError"));
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pickEditable(draft)),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setSaveError(body.error?.message ?? t("saveError"));
        return;
      }
      setSaved(body.data);
      setDraft(body.data);
      setShowSavedToast(true);
      window.setTimeout(() => setShowSavedToast(false), SAVED_TOAST_MS);
    } catch {
      setSaveError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setDraft(saved);
    setSaveError(null);
  }

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <Skeleton className="h-80 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-60 w-full rounded-3xl" />
        </div>
      </AccountLayout>
    );
  }

  if (error) {
    const message = error === "login" ? t("loginPrompt") : t("loadError");
    return (
      <ErrorState
        message={message}
        action={
          error === "login" && (
            <Link href="/login?next=/profile">
              <Button variant="primary">{t("goToLogin")}</Button>
            </Link>
          )
        }
      />
    );
  }

  if (!draft || !saved) return null;

  const dirty = EDITABLE_FIELDS.some((k) => draft[k] !== saved[k]);
  const memberSince = loyalty?.member_since ? formatDate(loyalty.member_since, locale, "long") : null;

  const completeness = [
    { targetId: AVATAR_INPUT_ID, label: t("fieldAvatar"), done: Boolean(saved.avatar_url) },
    { targetId: "full_name", label: t("fullName"), done: Boolean(draft.full_name?.trim()) },
    { targetId: "username", label: t("username"), done: Boolean(draft.username) },
    { targetId: "email", label: t("email"), done: Boolean(draft.email) },
    { targetId: "birthday", label: t("birthday"), done: Boolean(draft.birthday) },
    { targetId: "height_cm", label: t("height"), done: draft.height_cm !== null },
    { targetId: "weight_kg", label: t("weight"), done: draft.weight_kg !== null },
    { targetId: "goal", label: t("goal"), done: Boolean(draft.goal) },
    { targetId: "bio", label: t("bio"), done: Boolean(draft.bio?.trim()) },
  ];

  return (
    <AccountLayout>
      <ProfileHero
        fullName={saved.full_name}
        username={saved.username}
        email={saved.email}
        phone={saved.phone_number}
        avatarUrl={saved.avatar_url}
        verified={saved.status === "active"}
        loyalty={loyalty}
        avatarUploading={avatarUploading}
        onAvatarChange={handleAvatarChange}
      />
      {avatarError && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {avatarError}
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={handleSave} className="min-w-0 space-y-6">
          <FormSection icon={UserRound} title={t("sectionPersonal")} hint={t("sectionPersonalHint")}>
            <div className="grid gap-4 @lg:grid-cols-2">
              <Field id="full_name" label={t("fullName")} className="@lg:col-span-2">
                <input id="full_name" type="text" autoComplete="name" value={draft.full_name} onChange={(e) => update("full_name", e.target.value)} disabled={saving} className={PROFILE_INPUT_CLASS} />
              </Field>
              <Field id="username" label={t("username")}>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-ink-soft">@</span>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={draft.username ?? ""}
                    onChange={(e) => update("username", e.target.value.trim() || null)}
                    disabled={saving}
                    maxLength={64}
                    placeholder={t("usernamePlaceholder")}
                    className={`${PROFILE_INPUT_CLASS} pl-8`}
                  />
                </div>
              </Field>
              <Field id="email" label={t("email")}>
                <input id="email" type="email" autoComplete="email" value={draft.email ?? ""} onChange={(e) => update("email", e.target.value || null)} disabled={saving} className={PROFILE_INPUT_CLASS} />
              </Field>
              <Field id="phone" label={t("phone")} hint={t("phoneLocked")}>
                <div className="relative">
                  <input id="phone" type="tel" value={saved.phone_number} readOnly className={`${PROFILE_INPUT_CLASS} cursor-default pr-10 text-ink-muted`} />
                  <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
                </div>
              </Field>
              <Field id="birthday" label={t("birthday")}>
                <input id="birthday" type="date" autoComplete="bday" value={draft.birthday ?? ""} onChange={(e) => update("birthday", e.target.value || null)} disabled={saving} className={PROFILE_INPUT_CLASS} />
              </Field>
            </div>
          </FormSection>

          <FormSection icon={Activity} title={t("sectionFitness")} hint={t("sectionFitnessHint")}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field id="height_cm" label={t("height")}>
                  <UnitInput id="height_cm" unit={t("cm")} min={30} max={300} value={draft.height_cm} onChange={(v) => update("height_cm", v)} disabled={saving} />
                </Field>
                <Field id="weight_kg" label={t("weight")}>
                  <UnitInput id="weight_kg" unit={t("kg")} min={10} max={500} value={draft.weight_kg} onChange={(v) => update("weight_kg", v)} disabled={saving} />
                </Field>
              </div>
              <BmiMeter heightCm={draft.height_cm} weightKg={draft.weight_kg} />
              <div>
                <p id="goal-label" className="mb-1.5 text-sm font-medium text-ink-muted">
                  {t("goal")}
                </p>
                <GoalPicker id="goal" value={draft.goal} onChange={(goal) => update("goal", goal)} disabled={saving} />
              </div>
            </div>
          </FormSection>

          <FormSection icon={FileText} title={t("sectionAbout")} hint={t("sectionAboutHint")}>
            <Field
              id="bio"
              label={t("bio")}
              aside={<span className="text-xs tabular-nums text-ink-soft">{t("charCount", { count: (draft.bio ?? "").length, max: BIO_MAX })}</span>}
            >
              <textarea id="bio" rows={4} maxLength={BIO_MAX} value={draft.bio ?? ""} onChange={(e) => update("bio", e.target.value || null)} disabled={saving} className={`${PROFILE_INPUT_CLASS} resize-y`} />
            </Field>
          </FormSection>

          {/* Save bar: sticks to the bottom of the viewport while there are unsaved edits. */}
          {(dirty || saving || saveError) && (
            <div className="nz-glass-strong nz-rise sticky bottom-4 z-30 flex flex-col gap-3 rounded-2xl p-3 pl-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  {t("unsavedChanges")}
                </p>
                {saveError && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {saveError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleDiscard} disabled={saving} className="flex-1 sm:flex-none">
                  {t("discard")}
                </Button>
                <Button type="submit" variant="primary" disabled={saving || !dirty} className="flex-1 sm:flex-none">
                  {saving ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </div>
          )}
          {showSavedToast && !dirty && (
            <p role="status" className="nz-rise sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full bg-success px-4 py-2 text-sm font-medium text-white shadow-lg">
              <CircleCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("saved")}
            </p>
          )}
        </form>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <ProfileCompleteness items={completeness} />

          <section className="nz-glass rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-ink">{t("accountCard")}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">{t("accountStatus")}</dt>
                <dd className="flex items-center gap-1.5 font-medium text-success">
                  <span className="nz-pulse-dot h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  {t("accountStatusActive")}
                </dd>
              </div>
              {memberSince && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">{t("memberSinceLabel")}</dt>
                  <dd className="text-right font-medium text-ink">{memberSince}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 space-y-1 border-t border-border/70 pt-3">
              <QuickLink href="/account/settings" icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />} label={t("securityLink")} />
              <QuickLink href="/account/addresses" icon={<MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />} label={t("addressesLink")} />
            </div>
          </section>

          <MyStoreSummaryCard />
        </aside>
      </div>
    </AccountLayout>
  );
}

function UnitInput({ id, unit, min, max, value, onChange, disabled }: { id: string; unit: string; min: number; max: number; value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={0.1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className={`${PROFILE_INPUT_CLASS} pr-12 tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-ink-soft">{unit}</span>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="group -mx-2 flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
      <span className="text-ink-soft group-hover:text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
