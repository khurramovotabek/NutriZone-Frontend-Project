// Browsers' "uz" date data is incomplete (renders "M10 5, Mon"), so Uzbek
// labels are spelled out here; ru/en use Intl as usual.
const UZ_WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

/**
 * - `weekday`: "Dushanba, 5-oktabr" / "Monday, 5 October"
 * - `date`: "2026-yil 5-oktabr" / "5 Oct 2026"
 * - `long`: "2026-yil 5-oktabr" / "5 October 2026"
 * - `monthYear`: "2026-yil oktabr" / "October 2026"
 */
export type DateStyle = "weekday" | "date" | "long" | "monthYear";

const INTL_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  weekday: { weekday: "long", day: "numeric", month: "long" },
  date: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  monthYear: { month: "long", year: "numeric" },
};

export function formatDate(value: Date | string, locale: string, style: DateStyle): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  if (locale === "uz") {
    const day = `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
    if (style === "weekday") return `${UZ_WEEKDAYS[d.getDay()]}, ${day}`;
    if (style === "monthYear") return `${d.getFullYear()}-yil ${UZ_MONTHS[d.getMonth()]}`;
    return `${d.getFullYear()}-yil ${day}`;
  }
  return d.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", INTL_OPTIONS[style]);
}
