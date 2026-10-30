"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingBag, Sparkles, Star, Store as StoreIcon } from "lucide-react";
import { Card } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { Fieldset } from "@/components/store-dashboard/Fieldset";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import { STORE_AMENITIES, type StoreAmenity } from "@/components/store-dashboard/types";
import { AMENITY_ICONS } from "@/components/store-dashboard/amenities";

const INPUT_CLASS = "nz-glass-input w-full rounded-lg px-3.5 py-2.5";

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={`text-xs ${value > max * 0.9 ? "text-amber-500" : "text-ink-soft"}`}>{value}/{max}</span>;
}

/** Name, one-line tagline, description, what the store offers, and pickup orders -- with a live preview of the store card. */
export default function StoreProfilePage() {
  const t = useTranslations("myStore");
  const ta = useTranslations("storeAmenity");
  const { store, saveField } = useStoreDashboard();
  const [tagline, setTagline] = useState(store?.tagline ?? "");
  const [description, setDescription] = useState(store?.description ?? "");
  const [name, setName] = useState(store?.name ?? "");
  const [note, setNote] = useState(store?.pickup_note ?? "");
  if (!store) return null;

  const amenities = new Set(store.amenities ?? []);
  function toggleAmenity(a: StoreAmenity) {
    const next = new Set(amenities);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    saveField({ amenities: STORE_AMENITIES.filter((x) => next.has(x)) });
  }
  const pickupOn = store.pickup_enabled !== false;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-3 sm:p-5">
          <Fieldset legend={t("basicInfoLegend")} icon={<StoreIcon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
            <div>
              <label className="mb-1 flex justify-between text-sm font-medium text-ink-muted" htmlFor="store-name">{t("storeName")} <Counter value={name.length} max={200} /></label>
              <input id="store-name" type="text" value={name} maxLength={200} onChange={(e) => setName(e.target.value)}
                onBlur={() => name.trim() && name !== store.name && saveField({ name: name.trim() })} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="mb-1 flex justify-between text-sm font-medium text-ink-muted" htmlFor="store-tagline">{t("tagline")} <Counter value={tagline.length} max={140} /></label>
              <input id="store-tagline" type="text" value={tagline} maxLength={140} placeholder={t("taglinePlaceholder")} onChange={(e) => setTagline(e.target.value)}
                onBlur={() => tagline !== (store.tagline ?? "") && saveField({ tagline: tagline.trim() })} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="mb-1 flex justify-between text-sm font-medium text-ink-muted" htmlFor="store-description">{t("description")} <Counter value={description.length} max={1500} /></label>
              <textarea id="store-description" rows={5} value={description} maxLength={1500} onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== store.description && saveField({ description })} className={INPUT_CLASS} placeholder={t("descriptionPlaceholder")} />
              <p className="mt-1 text-xs text-ink-muted">{t("descriptionHint")}</p>
            </div>
          </Fieldset>
        </Card>

        <Card className="p-3 sm:p-5">
          <Fieldset legend={t("amenitiesLegend")} icon={<Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
            <p className="-mt-1 text-xs text-ink-muted">{t("amenitiesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {STORE_AMENITIES.map((a) => {
                const Icon = AMENITY_ICONS[a];
                const on = amenities.has(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-muted hover:text-ink"}`}>
                    {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {ta(a)}
                  </button>
                );
              })}
            </div>
          </Fieldset>
        </Card>

        <Card className="p-3 sm:p-5">
          <Fieldset legend={t("pickupLegend")} icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
            <label className="flex cursor-pointer items-start gap-3">
              <button type="button" role="switch" aria-checked={pickupOn} onClick={() => saveField({ pickup_enabled: !pickupOn })}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${pickupOn ? "bg-primary" : "bg-surface-3"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${pickupOn ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span>
                <span className="block text-sm font-semibold text-ink">{t("pickupToggle")}</span>
                <span className="block text-xs text-ink-muted">{pickupOn ? t("pickupOnHint") : t("pickupOffHint")}</span>
              </span>
            </label>
            <div>
              <label className="mb-1 flex justify-between text-sm font-medium text-ink-muted" htmlFor="pickup-note">{t("pickupNote")} <Counter value={note.length} max={300} /></label>
              <input id="pickup-note" type="text" value={note} maxLength={300} placeholder={t("pickupNotePlaceholder")} onChange={(e) => setNote(e.target.value)}
                onBlur={() => note !== (store.pickup_note ?? "") && saveField({ pickup_note: note.trim() })} className={INPUT_CLASS} disabled={!pickupOn} />
              <p className="mt-1 text-xs text-ink-muted">{t("pickupNoteHint")}</p>
            </div>
          </Fieldset>
        </Card>
      </div>

      {/* how the store looks on the site, updated as the owner types */}
      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("previewTitle")}</p>
        <div className="nz-glass overflow-hidden rounded-2xl">
          <div className="relative h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.45),transparent_45%),linear-gradient(135deg,#0f172a,#111827)]">
            {store.cover_image_url && <MediaImage src={store.cover_image_url} alt="" fit="cover" fallbackIcon={null} />}
          </div>
          <div className="p-4">
            <div className="-mt-10 mb-2 h-14 w-14 overflow-hidden rounded-xl border-4 border-[var(--color-bg)] bg-white">
              <div className="relative h-full w-full"><MediaImage src={store.logo_url} alt="" fit="contain" padding="p-1" fallbackIcon={<StoreIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />} /></div>
            </div>
            <p className="text-base font-bold text-ink">{name || t("manageStore")}</p>
            {tagline && <p className="text-sm text-ink-muted">{tagline}</p>}
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
              {store.rating_count ? `${(store.rating_average ?? 0).toFixed(1)} · ${t("ratingCount", { count: store.rating_count })}` : t("noRatingsYet")}
            </p>
            {amenities.size > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STORE_AMENITIES.filter((a) => amenities.has(a)).map((a) => {
                  const Icon = AMENITY_ICONS[a];
                  return <span key={a} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted"><Icon className="h-3 w-3" aria-hidden="true" />{ta(a)}</span>;
                })}
              </div>
            )}
            {pickupOn && <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500/12 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400"><ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />{t("pickupBadge")}</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
