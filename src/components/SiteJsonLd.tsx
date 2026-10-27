import type { PublicSiteSettings } from "@/lib/settings-api";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { localizedPath, type Locale } from "@/i18n/config";

/**
 * schema.org for the home page: the store as an Organization/OnlineStore (one @id that product offers and
 * branch pages point to), the WebSite with the catalog search as SearchAction, and the visible FAQ.
 * `alternateName` lists the spellings people type ("nutri zone", "нутризон") so search engines tie them to us.
 */
export default function SiteJsonLd({
  name, logoUrl, site, telegramUrl, locale, description, faq,
}: { name: string; logoUrl: string | null; site: PublicSiteSettings | null; telegramUrl: string | null; locale: Locale; description: string; faq: { q: string; a: string }[] }) {
  const sameAs = [telegramUrl, site?.instagram_url].filter(Boolean);
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const alternateName = Array.from(new Set([host, "NutriZone", "Nutri Zone", "Nutrizone.uz", "Нутризон", "NutriZone Uzbekistan", "LifeSport", "Life Sport", "LifeSport Pit", "Life Sport Pit", "Лайфспорт"].filter((n) => n.toLowerCase() !== name.toLowerCase())));
  const orgId = `${SITE_URL}/#organization`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": ["Organization", "OnlineStore"],
      "@id": orgId,
      name,
      alternateName,
      url: SITE_URL,
      description,
      ...(logoUrl ? { logo: logoUrl, image: logoUrl } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(site?.support_email ? { email: site.support_email } : {}),
      ...(site?.support_phone ? { telephone: site.support_phone } : {}),
      ...(site?.address ? { address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: "Tashkent", addressCountry: "UZ" } } : { address: { "@type": "PostalAddress", addressLocality: "Tashkent", addressCountry: "UZ" } }),
      areaServed: { "@type": "Country", name: "Uzbekistan" },
      currenciesAccepted: "UZS",
      knowsLanguage: ["uz", "ru", "en"],
      ...(site?.support_phone ? { contactPoint: { "@type": "ContactPoint", telephone: site.support_phone, contactType: "customer service", areaServed: "UZ", availableLanguage: ["Uzbek", "Russian", "English"], ...(site?.telegram_username ? { url: `https://t.me/${site.telegram_username.replace(/^@/, "")}` } : {}) } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name,
      alternateName,
      url: SITE_URL,
      inLanguage: locale,
      publisher: { "@id": orgId },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: absoluteUrl(`${localizedPath("/products", locale)}?q={search_term_string}`) }, "query-input": "required name=search_term_string" },
    },
    ...(faq.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: locale, mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
      : []),
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
