import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { getBrand, rebrandMessages } from "@/lib/brand";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, SUPPORTED_LOCALES, type Locale } from "./config";

function supported(value: string | null | undefined): Locale | null {
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : null;
}

export default getRequestConfig(async () => {
  // A /ru or /en address decides the language (src/proxy.ts); otherwise the visitor's own choice; otherwise Uzbek.
  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
  const locale: Locale = supported(headerList.get(LOCALE_HEADER)) ?? supported(cookieStore.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;

  return {
    locale,
    // The project name in every string follows Dashboard → Sozlamalar (e.g. NutriZone → LifeSport).
    messages: rebrandMessages((await import(`../../messages/${locale}.json`)).default, (await getBrand()).name),
  };
});
