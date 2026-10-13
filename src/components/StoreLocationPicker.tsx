"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LocationPicker from "@/components/LocationPicker";

/**
 * Thin, store-profile-flavored wrapper around the generic `LocationPicker`
 * (shared with the customer Address Book -- see account/addresses/page.tsx)
 * -- replaces the previous raw Latitude/Longitude number inputs (typing
 * exact decimal coordinates by hand is not how a real store owner would
 * ever set their own location). Click anywhere, drag the pin, or use the
 * picker's own built-in "use my location" button; the real lat/lng is
 * written straight to `store.latitude`/`longitude` via the existing
 * `saveField` PATCH -- never a second, parallel location field.
 */
export default function StoreLocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const t = useTranslations("myStore");
  const [locateError, setLocateError] = useState<string | null>(null);
  const hasLocation = latitude != null && longitude != null;

  return (
    <div className="space-y-1.5">
      <LocationPicker
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          onChange(lat, lng);
          setLocateError(null);
        }}
        hintText={t("locationPickerHint")}
        emptyText={t("locationPickerEmpty")}
        coordinatesText={hasLocation ? t("locationPickerCoordinates", { lat: latitude.toFixed(6), lng: longitude.toFixed(6) }) : ""}
        accuracyText={(meters) => t("locationPickerAccuracy", { meters })}
        locateLabel={t("useMyLocation")}
        locatingLabel={t("locating")}
        onLocateUnsupported={() => setLocateError(t("geolocationUnsupported"))}
        onLocateDenied={() => setLocateError(t("geolocationDenied"))}
        heightClassName="h-72"
      />
      {locateError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {locateError}
        </p>
      )}
    </div>
  );
}
