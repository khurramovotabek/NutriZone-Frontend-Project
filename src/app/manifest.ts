import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { getTranslations } from "next-intl/server";

/** Web app manifest: "Add to home screen" name/colours, and one more consistent brand signal for search engines. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [{ name, shortName, primaryColor }, t] = await Promise.all([getBrand(), getTranslations("seo")]);
  return {
    name: t("homeTitle", { brand: name }),
    short_name: shortName || name,
    description: t("homeDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: primaryColor || "#1d4ed8",
    lang: "uz",
    categories: ["shopping", "health", "sports", "food"],
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
