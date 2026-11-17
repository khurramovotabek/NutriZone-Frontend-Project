import type { LocateResult } from "@/lib/geo-locate";

/**
 * The best street line a point gives: "street house" when the geocoder knows them, else the most local part of its
 * label (a mahalla / neighbourhood, never the district, city, region, postcode or country) -- the customer then only
 * adds the house number instead of typing everything.
 */
export function streetLineFrom(r: LocateResult): string {
  const street = (r.street || "").trim();
  if (street) return [street, (r.house || "").trim()].filter(Boolean).join(" ");
  const skip = [r.district?.name, r.city?.name, r.region?.name, r.country?.name].filter(Boolean).map((n) => n!.toLowerCase());
  const norm = (v: string) => v.toLowerCase().replace(/[ʻ'`’]/g, "");
  const part = (r.label || "").split(",").map((x) => x.trim()).find((x) => {
    if (!x || /^\d+$/.test(x)) return false;
    const n = norm(x);
    if (/o.?zbekiston|uzbekistan|узбекистан/.test(n)) return false;
    return !skip.some((k) => n === norm(k) || n.includes(norm(k)) || norm(k).includes(n));
  });
  return part ?? "";
}
