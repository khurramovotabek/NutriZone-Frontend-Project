import type { PublicSiteSettings } from "@/lib/settings-api";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

/** schema.org Organization + WebSite (with the catalog search as SearchAction) for the home page. */
export default function SiteJsonLd({ name, logoUrl, site, telegramUrl }: { name: string; logoUrl: string | null; site: PublicSiteSettings | null; telegramUrl: string | null }) {
  const sameAs = [telegramUrl, site?.instagram_url].filter(Boolean);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name,
      url: SITE_URL,
      ...(logoUrl ? { logo: logoUrl } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(site?.support_phone ? { contactPoint: { "@type": "ContactPoint", telephone: site.support_phone, contactType: "customer service", areaServed: "UZ", availableLanguage: ["uz", "ru", "en"] } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name,
      url: SITE_URL,
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/products?q={search_term_string}") }, "query-input": "required name=search_term_string" },
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
