"use client";

import { useEffect, useState } from "react";
import { Lightbulb, LoaderCircle, MapPin, MapPinOff, Navigation, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Address, AddressTypeValue } from "@/lib/geo-api";
import { ADDRESS_TYPE_ICONS } from "@/lib/address-type-config";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import AddressForm from "@/components/AddressForm";
import MapLinks from "@/components/MapLinks";

/**
 * The Address Book is responsible ONLY for delivery-destination data:
 * Region -> City -> Address -> exact map location (see AddressForm.tsx).
 * Recipient identity (full name / phone / Telegram username) moved to
 * Checkout, where it's auto-filled from the authenticated user's real
 * profile and stays editable per order -- never asked for here.
 */
export default function AddressBookPage() {
  const t = useTranslations("account.addressesPage");
  const tType = useTranslations("account.addressTypes");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/addresses");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.success) {
          setError(res.status === 401 ? "login" : "load");
          return;
        }
        setAddresses(body.data);
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    setDeleteErrorId(null);
    try {
      const res = await fetch(`/api/addresses/${addressId}`, { method: "DELETE" });
      const body = await res.json();
      if (res.ok && body.success) {
        setAddresses((prev) => (prev ? prev.filter((a) => a.id !== addressId) : prev));
      } else {
        setDeleteErrorId(addressId);
      }
    } catch {
      setDeleteErrorId(addressId);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setShowForm(true);
  }

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </AccountLayout>
    );
  }

  if (error) {
    return (
      <AccountLayout>
        <ErrorState message={error === "login" ? t("loginPrompt") : t("loadError")} />
      </AccountLayout>
    );
  }

  const list = addresses ?? [];
  // Default address first, then the order the API returned.
  const sorted = [...list].sort((a, b) => Number(b.is_default) - Number(a.is_default));

  return (
    <AccountLayout>
      {/* Header */}
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[color-mix(in_srgb,var(--nz-success)_22%,transparent)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <span className="nz-cta flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <MapPin className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">
                {list.length > 0 ? `${t("count", { count: list.length })} · ` : ""}
                {t("subtitle")}
              </p>
            </div>
          </div>
          {!showForm && (
            <Button variant="primary" onClick={openCreate} className="shrink-0">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("addNew")}
            </Button>
          )}
        </div>
      </section>

      {showForm && (
        <FormPanel title={t("newAddressTitle")} onClose={() => setShowForm(false)} closeLabel={t("cancel")}>
          <AddressForm
            bare
            mode="create"
            onSaved={(created) => {
              setAddresses((prev) => (prev ? [...prev, created] : [created]));
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </FormPanel>
      )}

      {list.length === 0 && !showForm ? (
        <section className="nz-glass mt-6 flex flex-col items-center rounded-3xl px-6 py-14 text-center">
          <span className="relative flex h-20 w-20 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-primary-soft" />
            <span aria-hidden="true" className="nz-journey-pulse absolute inset-2 rounded-full border-2 border-primary/40" />
            <MapPin className="relative h-9 w-9 text-primary" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("emptyDescription")}</p>
          <Button variant="primary" className="mt-6" onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("addNew")}
          </Button>
        </section>
      ) : (
        list.length > 0 && (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {sorted.map((address) => {
              const TypeIcon = ADDRESS_TYPE_ICONS[address.address_type as AddressTypeValue] ?? MapPin;
              const hasLocation = address.coordinate_latitude !== null && address.coordinate_longitude !== null;
              // The backend's one-line format can end in ", " when trailing parts (e.g. postal code) are empty.
              const title = (address.formatted_single_line ?? address.line1).replace(/[\s,]+$/, "");

              if (editingId === address.id) {
                return (
                  <li key={address.id} className="md:col-span-2">
                    <FormPanel title={t("editAddressTitle")} onClose={() => setEditingId(null)} closeLabel={t("cancel")} inline>
                      <AddressForm
                        bare
                        mode="edit"
                        address={address}
                        onSaved={(updated) => {
                          setAddresses((prev) => (prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev));
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </FormPanel>
                  </li>
                );
              }

              return (
                <li key={address.id}>
                  <article
                    className={`nz-glass relative flex h-full flex-col overflow-hidden rounded-3xl transition-shadow hover:shadow-[var(--nz-glass-shadow-lg)] ${
                      address.is_default ? "ring-1 ring-primary/40" : ""
                    }`}
                  >
                    {address.is_default && <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(var(--nz-primary-rgb),0.16)] blur-2xl" />}
                    <div className="relative flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${address.is_default ? "nz-cta" : "bg-primary-soft text-primary"}`}>
                            <TypeIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">{tType(address.address_type as AddressTypeValue)}</p>
                            {address.is_default && (
                              <span className="mt-0.5 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">{t("default")}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForm(false);
                              setEditingId(address.id);
                            }}
                            aria-label={t("edit")}
                            title={t("edit")}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(address.id)}
                            aria-label={t("delete")}
                            title={t("delete")}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-[15px] font-medium leading-snug text-ink">{title}</p>
                      {(() => {
                        const m = address.metadata ?? {};
                        const parts = [
                          m.building_name,
                          m.entrance && `${t("entrance")} ${m.entrance}`,
                          m.floor && `${t("floor")} ${m.floor}`,
                          m.unit && `${t("unit")} ${m.unit}`,
                          m.entrance_code && `${t("entranceCode")} ${m.entrance_code}`,
                        ].filter(Boolean) as string[];
                        if (!parts.length && !m.delivery_instructions) return null;
                        return (
                          <div className="mt-2 space-y-1">
                            {parts.length > 0 && (
                              <ul className="flex flex-wrap gap-1.5">
                                {parts.map((p) => <li key={p} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-muted">{p}</li>)}
                              </ul>
                            )}
                            {m.delivery_instructions && <p className="text-xs leading-relaxed text-ink-soft">{t("landmark")}: {m.delivery_instructions}</p>}
                          </div>
                        );
                      })()}
                    </div>

                    <footer className="relative flex min-h-[3.75rem] flex-col justify-center border-t border-border/70 bg-surface-2/30 px-5 py-3">
                      {confirmingId === address.id ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{t("confirmDelete")}</p>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={() => setConfirmingId(null)} disabled={deletingId === address.id}>
                              {t("cancel")}
                            </Button>
                            <Button type="button" variant="destructive" className="px-3 py-1.5" onClick={() => handleDelete(address.id)} disabled={deletingId === address.id}>
                              {deletingId === address.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                              {t("confirmYes")}
                            </Button>
                          </div>
                        </div>
                      ) : hasLocation ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                            <Navigation className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                            {t("locationSaved")}
                          </span>
                          <MapLinks latitude={address.coordinate_latitude!} longitude={address.coordinate_longitude!} label={title} compact />
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning">
                            <MapPinOff className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                            {t("noLocation")}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowForm(false);
                              setEditingId(address.id);
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {t("addLocation")}
                          </button>
                        </div>
                      )}
                      {deleteErrorId === address.id && (
                        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                          {t("deleteError")}
                        </p>
                      )}
                    </footer>
                  </article>
                </li>
              );
            })}

            {!showForm && (
              <li>
                <button
                  type="button"
                  onClick={openCreate}
                  className="group flex h-full min-h-44 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border-hover p-5 text-ink-muted transition-all hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 transition-colors group-hover:bg-primary group-hover:text-white">
                    <Plus className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold">{t("addNew")}</span>
                </button>
              </li>
            )}
          </ul>
        )
      )}

      {list.length > 0 && (
        <aside className="mt-6 flex items-start gap-3 rounded-3xl border border-border/70 bg-surface-2/40 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/14 text-warning">
            <Lightbulb className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{t("tipTitle")}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{t("tipText")}</p>
          </div>
        </aside>
      )}
    </AccountLayout>
  );
}

function FormPanel({ title, onClose, closeLabel, inline = false, children }: { title: string; onClose: () => void; closeLabel: string; inline?: boolean; children: React.ReactNode }) {
  return (
    <section className={`nz-glass nz-rise overflow-hidden rounded-3xl ${inline ? "" : "mt-6"}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
