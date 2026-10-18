import type { ReactNode } from "react";
import { CalendarCheck, type LucideIcon } from "lucide-react";
import type { PolicySection } from "@/lib/legal/privacy";

/** Shared layout of the legal pages (/privacy, /terms): hero, sticky contents, numbered sections, closing block. */
export default function LegalDocument({ icon: Icon, title, lead, updatedLabel, updated, tocTitle, sections, children }: {
  icon: LucideIcon;
  title: string;
  lead: string;
  updatedLabel: string;
  updated: string;
  tocTitle: string;
  sections: PolicySection[];
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="nz-glass nz-rise relative overflow-hidden rounded-3xl p-6 sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_0%_0%,rgba(var(--nz-primary-rgb),0.16),transparent_60%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="nz-cta flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">{lead}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {updatedLabel}: {updated}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label={tocTitle} className="nz-glass h-fit rounded-2xl p-4 lg:sticky lg:top-24">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{tocTitle}</p>
          <ol className="mt-2 space-y-0.5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 space-y-4">
          {sections.map((s) => (
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
          {children}
        </article>
      </div>
    </div>
  );
}
