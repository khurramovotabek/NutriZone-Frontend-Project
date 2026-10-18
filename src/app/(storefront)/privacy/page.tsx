import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Mail, MapPin, Phone, Send, ShieldCheck } from "lucide-react";
import { getLocale } from "next-intl/server";
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="nz-glass nz-rise relative overflow-hidden rounded-3xl p-6 sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_0%_0%,rgba(var(--nz-primary-rgb),0.16),transparent_60%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="nz-cta flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{p.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">{p.lead}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {p.updated}: {formatDate(EFFECTIVE_DATE, locale, "long")}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label={p.tocTitle} className="nz-glass h-fit rounded-2xl p-4 lg:sticky lg:top-24">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{p.tocTitle}</p>
          <ol className="mt-2 space-y-0.5 text-sm">
            {p.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 space-y-4">
          {p.sections.map((s) => (
            <section key={s.id} id={s.id} className="nz-glass scroll-mt-24 rounded-2xl p-5 sm:p-7">
              <h2 className="text-lg font-semibold text-ink sm:text-xl">{s.title}</h2>
              {s.paragraphs?.map((text) => (
                <p key={text.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                  {text}
                </p>
              ))}
              {s.items && (
                <ul className="mt-3 space-y-2">
                  {s.items.map((item) => (
                    <li key={item.slice(0, 40)} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

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
        </article>
      </div>
    </div>
  );
}
