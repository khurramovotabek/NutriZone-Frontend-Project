import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone, Send, ShieldCheck } from "lucide-react";
import { getLocale } from "next-intl/server";
import LegalDocument from "@/components/legal/LegalDocument";
import { EFFECTIVE_DATE, privacyPolicy } from "@/lib/legal/privacy";
import { getPublicSiteSettings, type PublicSiteSettings } from "@/lib/settings-api";
import { formatDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const p = privacyPolicy(await getLocale());
  return pageMetadata({ path: "/privacy", title: p.title, description: p.lead });
}

async function contacts(): Promise<PublicSiteSettings | null> {
  try {
    const res = await getPublicSiteSettings();
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

/** `/privacy` -- the privacy policy (text in src/lib/legal/privacy.ts), with the shop's live contact details. */
export default async function PrivacyPage() {
  const locale = await getLocale();
  const p = privacyPolicy(locale);
  const site = await contacts();
  const phone = site?.support_phone?.trim();
  const email = site?.support_email?.trim();
  const telegram = site?.telegram_username?.trim().replace(/^@/, "");

  return (
    <LegalDocument icon={ShieldCheck} title={p.title} lead={p.lead} updatedLabel={p.updated} updated={formatDate(EFFECTIVE_DATE, locale, "long")} tocTitle={p.tocTitle} sections={p.sections}>
      <section id="contact" className="scroll-mt-24 rounded-2xl bg-[linear-gradient(150deg,color-mix(in_srgb,var(--nz-primary)_92%,black),color-mix(in_srgb,var(--nz-primary)_55%,#0e9f5f))] p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold">{p.contactTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">{p.contactText}</p>
        <div className="mt-5 flex flex-wrap gap-2.5 text-sm font-semibold">
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 ring-1 ring-white/25 transition hover:bg-white/25">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {phone}
            </a>
          )}
          {telegram && (
            <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 ring-1 ring-white/25 transition hover:bg-white/25">
              <Send className="h-4 w-4" aria-hidden="true" />@{telegram}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 ring-1 ring-white/25 transition hover:bg-white/25">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {email}
            </a>
          )}
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[var(--nz-primary)] transition hover:-translate-y-0.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {site?.address || "nutrizone.uz/contact"}
          </Link>
        </div>
      </section>
    </LegalDocument>
  );
}
