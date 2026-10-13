import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getBrand, rebrandMessages } from "@/lib/brand";
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = SUPPORTED_LOCALES.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    // The project name in every string follows Dashboard → Sozlamalar (e.g. NutriZone → LifeSport).
    messages: rebrandMessages((await import(`../../messages/${locale}.json`)).default, (await getBrand()).name),
  };
});
