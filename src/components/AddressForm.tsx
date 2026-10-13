"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, MapPinCheck, TriangleAlert, Wand2 } from "lucide-react";
import type { Address, AddressDetails, AddressTypeValue, CoordinateSource, District, Region, RegionCity } from "@/lib/geo-api";
import type { LocateResult } from "@/lib/geo-locate";
import type { PickMeta } from "@/components/LocationPicker";
import { Button, Card } from "@/components/ui";
import Combobox from "@/components/Combobox";
import AddressTypePicker from "@/components/AddressTypePicker";

// Code-split: Leaflet is only downloaded once someone actually opens an address form.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-2" aria-hidden="true" />,
});

const INPUT_CLASS = "nz-glass-input w-full rounded-lg px-4 py-2.5";
const DETAIL_KEYS = ["building_name", "entrance", "floor", "unit", "entrance_code", "delivery_instructions"] as const;
type Point = { latitude: number; longitude: number; source: CoordinateSource; accuracy: number | null };

/**
 * The delivery-location form -- Region → City → District → street → exact point → courier details -- shared by the
 * Address Book (add + edit) and Checkout's inline "add new address".
 *
 * The map drives the rest: when a point is set (GPS, pin, search, pasted link) the backend resolves it
 * (/api/geo/locate) and the form selects the region, city and district itself and offers the street
 * ("Amir Temur ko'chasi 15") -- the customer only checks it. Podyezd, floor, flat, door code and a landmark go to
 * the courier with the order.
 *
 * Recipient name / phone are not asked here (that's checkout's RecipientForm): the backend requires them, so the
 * customer's own profile data (GET /api/profile) is sent.
 */
export default function AddressForm({
  mode,
  address,
  onSaved,
  onCancel,
  bare = false,
}: {
  mode: "create" | "edit";
  /** Required when mode === "edit". */
  address?: Address;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  /** Render without the surrounding Card, for a caller that already frames it. */
  bare?: boolean;
}) {
  const t = useTranslations("account.addressesPage");
  const locale = useLocale();

  const [addressType, setAddressType] = useState<AddressTypeValue>((address?.address_type as AddressTypeValue) ?? "residential");

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionId, setRegionId] = useState(address?.region_id ?? "");
  const [resolvingRegion, setResolvingRegion] = useState(mode === "edit" && !!address?.city_id && !address?.region_id);

  // lists are tagged with the region they were loaded for, so loading state derives from the current regionId
  const [loadedCities, setLoadedCities] = useState<{ regionId: string; list: RegionCity[] } | null>(null);
  const cities = regionId && loadedCities?.regionId === regionId ? loadedCities.list : [];
  const citiesLoading = !!regionId && loadedCities?.regionId !== regionId;
  const [cityId, setCityId] = useState(address?.city_id ?? "");
  const [loadedDistricts, setLoadedDistricts] = useState<{ regionId: string; list: District[] } | null>(null);
  const districts = regionId && loadedDistricts?.regionId === regionId ? loadedDistricts.list : [];
  const [districtId, setDistrictId] = useState(address?.district_id ?? "");

  const [line1, setLine1] = useState(address?.line1 ?? "");
  const line1Ref = useRef(line1);
  useEffect(() => {
    line1Ref.current = line1;
  }, [line1]);
  const [details, setDetails] = useState<AddressDetails>(() => Object.fromEntries(DETAIL_KEYS.map((k) => [k, address?.metadata?.[k] ?? ""])) as AddressDetails);

  const [coordinate, setCoordinate] = useState<Point | null>(
    address?.coordinate_latitude != null && address?.coordinate_longitude != null
      ? { latitude: address.coordinate_latitude, longitude: address.coordinate_longitude, source: (address.coordinate_source as CoordinateSource) ?? "gps", accuracy: address.coordinate_accuracy_meters ?? null }
      : null,
  );
  const coordinateChanged = useRef(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<LocateResult | null>(null);
  const [streetSuggestion, setStreetSuggestion] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const autoSelectedSingleRegion = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo/regions")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled || !body.success) return;
        setRegions(body.data);
        if (body.data.length === 1 && !regionId && !autoSelectedSingleRegion.current) {
          autoSelectedSingleRegion.current = true;
          setRegionId(body.data[0].id);
        }
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // an older address saved without region_id: find its region from the city once
  useEffect(() => {
    if (!resolvingRegion || !address?.city_id) return;
    let cancelled = false;
    fetch(`/api/geo/cities/${address.city_id}/ancestors`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.success) setRegionId(body.data.region.id);
      })
      .finally(() => {
        if (!cancelled) setResolvingRegion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvingRegion, address?.city_id]);

  useEffect(() => {
    if (!regionId) return;
    let cancelled = false;
    fetch(`/api/geo/cities?regionId=${regionId}`)
      .then((res) => res.json())
      .then((body) => !cancelled && setLoadedCities({ regionId, list: body.success ? body.data : [] }))
      .catch(() => !cancelled && setLoadedCities({ regionId, list: [] }));
    fetch(`/api/geo/districts?regionId=${regionId}`)
      .then((res) => res.json())
      .then((body) => !cancelled && setLoadedDistricts({ regionId, list: body.success ? body.data : [] }))
      .catch(() => !cancelled && setLoadedDistricts({ regionId, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  // a point → region / city / district selected for the customer, the street offered
  useEffect(() => {
    if (!coordinate || !coordinateChanged.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setDetecting(true);
      fetch(`/api/geo/locate?lat=${coordinate.latitude}&lng=${coordinate.longitude}&lang=${locale}`)
        .then((res) => res.json())
        .then((body) => {
          if (cancelled || !body?.success) return;
          const r: LocateResult = body.data;
          setDetected(r);
          if (r.in_service_area && r.region && r.city) {
            setRegionId(r.region.id);
            setCityId(r.city.id);
            setDistrictId(r.district?.id ?? "");
          }
          const street = (r.street || "").trim();
          const current = line1Ref.current.trim();
          if (street && !current) {
            setLine1(street);
            setStreetSuggestion(null);
          } else {
            setStreetSuggestion(street && current.toLowerCase() !== street.toLowerCase() ? street : null);
          }
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setDetecting(false));
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [coordinate, locale]);

  function handleRegionChange(newRegionId: string) {
    setRegionId(newRegionId);
    setCityId(""); // a city / district of the previous region must never be submitted silently
    setDistrictId("");
  }

  function setDetail(key: (typeof DETAIL_KEYS)[number], value: string) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  const canSubmit = !!regionId && !!cityId && !!line1.trim() && !submitting && !resolvingRegion;

  async function saveCoordinates(id: string): Promise<Address | null> {
    if (!coordinate) return null;
    const res = await fetch(`/api/addresses/${id}/coordinates`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: coordinate.latitude, longitude: coordinate.longitude, source: coordinate.source, accuracy: coordinate.accuracy }),
    });
    const body = await res.json();
    return res.ok && body.success ? body.data : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const metadata = Object.fromEntries(DETAIL_KEYS.map((k) => [k, (details[k] ?? "").trim()]));
    try {
      if (mode === "create") {
        const profileRes = await fetch("/api/profile");
        const profileBody = await profileRes.json();
        if (!profileRes.ok || !profileBody.success) {
          setFormError(t("profileLoadError"));
          return;
        }
        const region = regions.find((r) => r.id === regionId);
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addressType, countryId: region?.country_id, cityId, line1: line1.trim(), districtId: districtId || undefined, metadata,
            recipientName: profileBody.data.full_name, recipientPhone: profileBody.data.phone_number,
          }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          setFormError(body.error?.message ?? t("createError"));
          return;
        }
        onSaved((await saveCoordinates(body.data.id)) ?? body.data);
      } else if (address) {
        const res = await fetch(`/api/addresses/${address.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addressType, cityId, line1: line1.trim(), districtId: districtId || undefined, metadata }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          setFormError(body.error?.message ?? t("updateError"));
          return;
        }
        onSaved((coordinateChanged.current ? await saveCoordinates(address.id) : null) ?? body.data);
      }
    } catch {
      setFormError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }));
  const cityOptions = cities.map((c) => ({ value: c.id, label: c.name }));
  const districtOptions = districts.map((d) => ({ value: d.id, label: d.name }));
  const detectedPlace = detected?.in_service_area ? [detected.district?.name, detected.city?.name].filter(Boolean).join(", ") : "";

  const form = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-muted">{t("addressType")}</label>
        <AddressTypePicker value={addressType} onChange={setAddressType} disabled={submitting} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-muted">{t("exactLocation")}</label>
        <LocationPicker
          latitude={coordinate?.latitude ?? null}
          longitude={coordinate?.longitude ?? null}
          onChange={(lat, lng, meta?: PickMeta) => {
            coordinateChanged.current = true;
            setCoordinate({ latitude: lat, longitude: lng, source: meta?.source ?? "map_pin", accuracy: meta?.accuracy ?? null });
            setLocationError(null);
          }}
          hintText={t("mapClickHint")}
          emptyText={t("locationHint")}
          coordinatesText={coordinate ? t("coordinatesPreview", { lat: coordinate.latitude.toFixed(6), lng: coordinate.longitude.toFixed(6) }) : ""}
          accuracyText={(meters) => t("accuracyPreview", { meters })}
          locateLabel={t("useMyLocation")}
          locatingLabel={t("locating")}
          onLocateUnsupported={() => setLocationError(t("geolocationUnsupported"))}
          onLocateDenied={() => setLocationError(t("geolocationPermissionDenied"))}
          onLocateUnavailable={() => setLocationError(t("geolocationUnavailable"))}
          onLocateTimeout={() => setLocationError(t("geolocationTimeout"))}
          heightClassName="h-72"
          shareLabel={line1 || undefined}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {coordinate && (
            <button type="button" onClick={() => { coordinateChanged.current = true; setCoordinate(null); setDetected(null); setStreetSuggestion(null); }} className="font-medium text-primary underline hover:no-underline">
              {t("locationRemove")}
            </button>
          )}
          {detecting && (
            <span className="inline-flex items-center gap-1 text-ink-soft"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{t("detecting")}</span>
          )}
          {!detecting && detectedPlace && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"><MapPinCheck className="h-3.5 w-3.5" aria-hidden="true" />{t("autoFilled", { place: detectedPlace })}</span>
          )}
        </div>
        {!detecting && detected && !detected.in_service_area && detected.distance_km != null && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />{t("outsideArea", { km: Math.round(detected.distance_km) })}</p>
        )}
        {locationError && (
          <p role="alert" aria-live="polite" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{locationError}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-form-region" className="mb-1 block text-sm font-medium text-ink-muted">{t("region")}</label>
          <Combobox id="address-form-region" value={regionId} onChange={handleRegionChange} options={regionOptions} placeholder={t("selectRegion")}
            emptyMessage={t("noRegionsAvailable")} loading={regionsLoading || resolvingRegion} disabled={submitting} />
        </div>
        <div>
          <label htmlFor="address-form-city" className="mb-1 block text-sm font-medium text-ink-muted">{t("city")}</label>
          <Combobox id="address-form-city" value={cityId} onChange={setCityId} options={cityOptions} placeholder={t("selectCity")}
            emptyMessage={regionId ? t("noCitiesForRegion") : t("selectRegionFirst")} loading={citiesLoading} disabled={submitting || !regionId} />
        </div>
        {districtOptions.length > 0 && (
          <div className="sm:col-span-2">
            <label htmlFor="address-form-district" className="mb-1 block text-sm font-medium text-ink-muted">{t("district")}</label>
            <Combobox id="address-form-district" value={districtId} onChange={setDistrictId} options={districtOptions} placeholder={t("district")} emptyMessage="—" disabled={submitting} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="address-form-line1" className="mb-1 block text-sm font-medium text-ink-muted">{t("addressLine")}</label>
        <input id="address-form-line1" type="text" value={line1} onChange={(e) => setLine1(e.target.value)} disabled={submitting} placeholder={t("addressLinePlaceholder")} className={INPUT_CLASS} maxLength={255} />
        {streetSuggestion && (
          <button type="button" onClick={() => { setLine1(streetSuggestion); setStreetSuggestion(null); }} className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />{t("useStreet", { street: streetSuggestion })}
          </button>
        )}
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-ink">{t("detailsTitle")}</legend>
        <p className="-mt-1 text-xs text-ink-soft">{t("detailsHint")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["entrance", "floor", "unit", "entrance_code"] as const).map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">{t(({ entrance: "entrance", floor: "floor", unit: "unit", entrance_code: "entranceCode" } as const)[k])}</span>
              <input type="text" value={details[k] ?? ""} onChange={(e) => setDetail(k, e.target.value)} disabled={submitting} className={INPUT_CLASS} maxLength={k === "entrance_code" ? 32 : 16} inputMode={k === "entrance_code" ? "text" : "numeric"} />
            </label>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">{t("buildingName")}</span>
          <input type="text" value={details.building_name ?? ""} onChange={(e) => setDetail("building_name", e.target.value)} disabled={submitting} placeholder={t("buildingPlaceholder")} className={INPUT_CLASS} maxLength={128} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">{t("landmark")}</span>
          <textarea value={details.delivery_instructions ?? ""} onChange={(e) => setDetail("delivery_instructions", e.target.value)} disabled={submitting} placeholder={t("landmarkPlaceholder")} className={`${INPUT_CLASS} min-h-[72px] resize-y`} maxLength={500} rows={2} />
        </label>
      </fieldset>

      {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit} variant="primary">{submitting ? t("saving") : t("save")}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>{t("cancel")}</Button>}
      </div>
    </form>
  );

  return bare ? form : <Card>{form}</Card>;
}
