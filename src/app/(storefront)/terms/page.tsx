import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FileSignature, ShieldCheck } from "lucide-react";
import { getLocale } from "next-intl/server";
import LegalDocument from "@/components/legal/LegalDocument";
import { TERMS_EFFECTIVE_DATE, termsOfSale } from "@/lib/legal/terms";
import { getPublicSiteSettings, type PublicSiteSettings } from "@/lib/settings-api";
import { formatDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = termsOfSale(await getLocale());
  return pageMetadata({ path: "/terms", title: t.title, description: t.lead });
}

async function siteSettings(): Promise<PublicSiteSettings | null> {
  try {
    const res = await getPublicSiteSettings();
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

/** `/terms` -- the public offer (text in src/lib/legal/terms.ts); seller requisites from Dashboard → Chek sozlamalari. */
export default async function TermsPage() {
  const locale = await getLocale();
  const t = termsOfSale(locale);
  const site = await siteSettings();
  const req = site?.requisites;
  const labels = t.requisitesLabels;
  const rows = [
    [labels.legalName, req?.legal_name],
    [labels.tin, req?.tin],
    [labels.address, req?.address || site?.address],
    [labels.phone, req?.phone || site?.support_phone],
    [labels.email, site?.support_email],
    [labels.site, SITE_URL.replace(/^https?:\/\//, "")],
  ].filter((r): r is [string, string] => Boolean(r[1]?.trim()));

  return (
    <LegalDocument icon={FileSignature} title={t.title} lead={t.lead} updatedLabel={t.updated} updated={formatDate(TERMS_EFFECTIVE_DATE, locale, "long")} tocTitle={t.tocTitle} sections={t.sections}>
      <section id="requisites" className="nz-glass scroll-mt-24 rounded-2xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink sm:text-xl">
          <Building2 className="h-5 w-5 text-primary" strokeWidth={1.8} aria-hidden="true" />
          {t.requisitesTitle}
        </h2>
        {!req?.legal_name && <p className="mt-3 text-sm text-ink-muted">{t.requisitesPending}</p>}
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-ink-soft">{label}</dt>
              <dd className="font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
        <Link href="/privacy" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {t.sections.at(-1)?.paragraphs?.at(-1)}
        </Link>
      </section>
    </LegalDocument>
  );
}
