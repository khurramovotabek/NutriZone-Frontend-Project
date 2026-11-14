import { ArrowUpRight, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** "https://t.me/nutrizonepit" -> "nutrizonepit", "https://instagram.com/nutrizone.uz/" -> "nutrizone.uz". */
function handleOf(url: string) {
  return url.trim().replace(/^https?:\/\/(www\.)?[^/]+\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}

/**
 * Follow the brand: the Telegram channel and Instagram, as two big tap targets (both links come from Dashboard ->
 * Sozlamalar, so a changed handle needs no deploy). Renders nothing when neither is set.
 */
export default async function SocialFollow({ telegramUrl, instagramUrl }: { telegramUrl: string | null; instagramUrl: string | null }) {
  if (!telegramUrl && !instagramUrl) return null;
  const t = await getTranslations("home.social");
  const card =
    "group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-3xl p-5 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1 sm:p-6";

  return (
    <section aria-labelledby="social-follow-title" className="mt-10 sm:mt-16">
      <div className="mb-5 text-center sm:mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("eyebrow")}</p>
        <h2 id="social-follow-title" className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t("title")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted sm:text-base">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        {telegramUrl && (
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={`${card} bg-[linear-gradient(135deg,#0b5f8f_0%,#1d9bd8_60%,#3fb6ee_100%)] shadow-sky-900/20`}>
            <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
              <Send className="h-7 w-7 -translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-white/75">{t("telegramLabel")}</span>
              <span className="block truncate text-lg font-extrabold">@{handleOf(telegramUrl)}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-white/85">{t("telegramText")}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-sky-700 shadow">
                {t("telegramCta")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </span>
          </a>
        )}
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`${card} bg-[linear-gradient(135deg,#f58529_0%,#dd2a7b_45%,#8134af_80%,#515bd4_100%)] shadow-pink-900/20`}>
            <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
              <InstagramGlyph className="h-7 w-7" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-white/75">Instagram</span>
              <span className="block truncate text-lg font-extrabold">@{handleOf(instagramUrl)}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-white/85">{t("instagramText")}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-pink-700 shadow">
                {t("instagramCta")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
