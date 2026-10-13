/**
 * Shared by VariantSelector/ProductPurchaseExperience -- a variant's
 * real-world measure now spans mass (g/kg), volume (ml/l), and a
 * plain unit count (tablet/capsule/gummy/chewable), per the admin's
 * own explicit unit picker -- never assumed to always be grams, and
 * never auto-converted between units.
 */
const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  g: { singular: "g", plural: "g" },
  kg: { singular: "kg", plural: "kg" },
  ml: { singular: "ml", plural: "ml" },
  l: { singular: "L", plural: "L" },
  tablet: { singular: "tablet", plural: "tablets" },
  capsule: { singular: "capsule", plural: "capsules" },
  gummy: { singular: "gummy", plural: "gummies" },
  chewable: { singular: "chewable", plural: "chewables" },
};

export function formatWeight(value: number | null | undefined, unit: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = Number.isInteger(value) ? value.toString() : value.toString().replace(/0+$/, "").replace(/\.$/, "");
  const label = UNIT_LABELS[unit ?? "g"] ?? UNIT_LABELS.g;
  return `${trimmed} ${value === 1 ? label.singular : label.plural}`;
}

/** A catalog size facet key ("250g", "2270g", "1.5kg", "60capsule") as a readable label; grams of 1000+ read as kilograms ("2.27 kg"). */
export function formatSizeKey(key: string): string {
  const match = key.match(/^(\d+(?:\.\d+)?)([a-z]+)$/i);
  if (!match) return key;
  let value = Number(match[1]);
  let unit = match[2].toLowerCase();
  if (unit === "g" && value >= 1000) {
    value = Math.round((value / 1000) * 1000) / 1000;
    unit = "kg";
  }
  return formatWeight(value, unit) ?? key;
}
