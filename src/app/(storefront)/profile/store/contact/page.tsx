"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { AtSign, Landmark, LoaderCircle, Mail, MapPin, Phone, Send, Wand2 } from "lucide-react";
import { Card } from "@/components/ui";
import MapLinks from "@/components/MapLinks";
import { Fieldset } from "@/components/store-dashboard/Fieldset";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import PhoneListEditor from "@/components/store-dashboard/PhoneListEditor";
import type { PickMeta } from "@/components/LocationPicker";
import type { LocateResult } from "@/lib/geo-locate";

// Code-split: Leaflet is only downloaded on this page.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-surface-2" aria-hidden="true" />,
});

const INPUT = "nz-glass-input w-full rounded-lg px-3 py-2 text-sm";

/** "@nutrizone", "t.me/nutrizone", "https://instagram.com/nutrizone/" → "nutrizone". */
function handle(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}

/**
 * Contact & location: phones, email, Telegram / Instagram handles, and the shop's exact point on the map -- set by a
 * click, a search, a pasted Yandex / Google link or GPS. From the point the street, district and city are offered in
 * one click (/api/geo/locate), and a landmark tells customers where the entrance is.
 */
export default function StoreContactPage() {
  const t = useTranslations("myStore");
  const tp = useTranslations("account.addressesPage");
  const locale = useLocale();
  const { store, saveField } = useStoreDashboard();
  const [locateError, setLocateError] = useState<string | null>(null);
  const [found, setFound] = useState<LocateResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  // While GPS is still refining, the pin follows the fixes here; only the final point is saved.
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [savingPoint, setSavingPoint] = useState(false);
  const [savedPoint, setSavedPoint] = useState(false);
  const seq = useRef(0);
  if (!store) return null;
  const pointLat = draft?.lat ?? store.latitude;
  const pointLng = draft?.lng ?? store.longitude;
  const hasPoint = pointLat != null && pointLng != null;

  async function onPoint(lat: number, lng: number, meta?: PickMeta) {
    setLocateError(null);
    setDraft({ lat, lng });
    if (meta?.final === false) return;
    const mine = ++seq.current; // a slower earlier save must never overwrite a newer point
    setSavingPoint(true);
    setSavedPoint(false);
    try {
      await saveField({ latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) });
    } finally {
      if (mine === seq.current) {
        setSavingPoint(false);
        setSavedPoint(true);
        setDraft(null);
      }
    }
    if (mine !== seq.current) return;
    setDetecting(true);
    try {
      const res = await fetch(`/api/geo/locate?lat=${lat}&lng=${lng}&lang=${locale}`);
      const body = await res.json();
      if (mine === seq.current) setFound(body?.success ? body.data : null);
    } catch {
      if (mine === seq.current) setFound(null);
    } finally {
      if (mine === seq.current) setDetecting(false);
    }
  }

  const suggestion = found && (found.street || found.district || found.city)
    ? { address: found.street || store.address, district: (found.district?.name ?? "").replace(/ tumani$/i, ""), city: found.city?.name ?? store.city }
    : null;
  const differs = suggestion && (suggestion.address !== store.address || suggestion.district !== store.district || suggestion.city !== store.city);

  return (
    <div className="space-y-6">
      <Card className="p-3 sm:p-5">
        <Fieldset legend={t("location")} icon={<MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
          <LocationPicker
            latitude={pointLat} longitude={pointLng} onChange={onPoint}
            hintText={t("locationPickerHint")} emptyText={t("locationPickerEmpty")}
            coordinatesText={hasPoint ? t("locationPickerCoordinates", { lat: pointLat!.toFixed(6), lng: pointLng!.toFixed(6) }) : ""}
            accuracyText={(meters) => t("locationPickerAccuracy", { meters })} locateLabel={t("useMyLocation")} locatingLabel={t("locating")}
            onLocateUnsupported={() => setLocateError(t("geolocationUnsupported"))} onLocateDenied={() => setLocateError(t("geolocationDenied"))}
            onLocateUnavailable={() => setLocateError(tp("geolocationUnavailable"))} onLocateTimeout={() => setLocateError(tp("geolocationTimeout"))}
            heightClassName="h-80" shareLabel={store.name}
          />
          {locateError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{locateError}</p>}
          {(savingPoint || savedPoint) && (
            <p className={`flex items-center gap-1.5 text-xs font-medium ${savingPoint ? "text-ink-soft" : "text-emerald-600 dark:text-emerald-400"}`} aria-live="polite">
              {savingPoint ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
              {savingPoint ? t("locationSaving") : t("locationSaved")}
            </p>
          )}
          {detecting && <p className="flex items-center gap-1.5 text-xs text-ink-soft"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {tp("detecting")}</p>}
          {!detecting && differs && suggestion && (
            <button type="button" onClick={() => { saveField({ address: suggestion.address, district: suggestion.district, city: suggestion.city }); setFound(null); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("fillFromMap", { place: [suggestion.address, suggestion.district, suggestion.city].filter(Boolean).join(", ") })}
            </button>
          )}

          {/* keyed by the saved values, so a "fill from map" re-renders the inputs with the new text */}
          <div key={`${store.address}|${store.city}|${store.district}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="location-address">{t("address")}</label>
              <input id="location-address" type="text" defaultValue={store.address} maxLength={255} placeholder={t("addressPlaceholder")}
                onBlur={(e) => e.target.value !== store.address && saveField({ address: e.target.value.trim() })} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="location-city">{t("city")}</label>
              <input id="location-city" type="text" defaultValue={store.city} maxLength={100} onBlur={(e) => e.target.value !== store.city && saveField({ city: e.target.value.trim() })} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="location-district">{t("district")}</label>
              <input id="location-district" type="text" defaultValue={store.district} maxLength={100} onBlur={(e) => e.target.value !== store.district && saveField({ district: e.target.value.trim() })} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted" htmlFor="location-landmark"><Landmark className="h-3.5 w-3.5" aria-hidden="true" /> {t("landmark")}</label>
              <input id="location-landmark" type="text" defaultValue={store.landmark ?? ""} maxLength={255} placeholder={t("landmarkPlaceholder")}
                onBlur={(e) => e.target.value !== (store.landmark ?? "") && saveField({ landmark: e.target.value.trim() })} className={INPUT} />
              <p className="mt-1 text-xs text-ink-muted">{t("landmarkHint")}</p>
            </div>
          </div>
          {hasPoint && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2/60 p-3">
              <p className="text-xs text-ink-muted">{t("shareLocationHint")}</p>
              <MapLinks latitude={store.latitude!} longitude={store.longitude!} label={`${store.name}${store.address ? `, ${store.address}` : ""}`} />
            </div>
          )}
        </Fieldset>
      </Card>

      <Card className="p-3 sm:p-5">
        <Fieldset legend={t("contact")} icon={<Phone className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted" htmlFor="contact-phone"><Phone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />{t("phoneNumbers")}</label>
              <PhoneListEditor value={store.phone_numbers} onSave={(phones) => saveField({ phone_numbers: phones })} />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted" htmlFor="contact-email"><Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />{t("email")}</label>
              <input id="contact-email" type="email" defaultValue={store.email} placeholder="shop@example.uz" onBlur={(e) => e.target.value !== store.email && saveField({ email: e.target.value.trim() })} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted" htmlFor="contact-telegram"><Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />{t("telegram")}</label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                <input id="contact-telegram" type="text" defaultValue={store.telegram_username} placeholder="nutrizone_uz"
                  onBlur={(e) => { const v = handle(e.target.value); e.target.value = v; if (v !== store.telegram_username) saveField({ telegram_username: v }); }} className={`${INPUT} pl-8`} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="contact-instagram">{t("instagram")}</label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                <input id="contact-instagram" type="text" defaultValue={store.instagram_username} placeholder="nutrizone.uz"
                  onBlur={(e) => { const v = handle(e.target.value); e.target.value = v; if (v !== store.instagram_username) saveField({ instagram_username: v }); }} className={`${INPUT} pl-8`} />
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-muted">{t("handleHint")}</p>
        </Fieldset>
      </Card>
    </div>
  );
}
