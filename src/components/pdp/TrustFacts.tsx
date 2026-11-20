import { CalendarCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Ishonch belgilari inside the buy box: "Rasmiy distribyutor" (only when Dashboard → Brendlar says so) and the expiry
 * of the batch the shopper gets now (earliest non-expired batch on hand). Renders nothing when neither is known.
 */
export default function TrustFacts({ brandName, official, expiry }: { brandName: string | null; official: boolean; expiry: string | null }) {
  const t = useTranslations("product");
  if (!official && !expiry) return null;
  // "03.2028": the same on the server and in every browser (Intl's Uzbek month names differ between them)
  const expiryText = expiry ? `${expiry.slice(5, 7)}.${expiry.slice(0, 4)}` : null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {official && (
        <li className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {brandName ? t("trustOfficialBrand", { brand: brandName }) : t("trustOfficial")}
        </li>
      )}
      {expiryText && (
        <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
          title={t("trustExpiryHint")}>
          <CalendarCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("trustExpiry", { date: expiryText })}
        </li>
      )}
    </ul>
  );
}
