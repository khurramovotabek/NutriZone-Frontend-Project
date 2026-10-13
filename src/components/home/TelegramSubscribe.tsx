import { Bell, CheckCircle2, Gift, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getNewsSubscriptionInfo } from "@/lib/api";

/** News & promotions in the Telegram bot, with the one-time coin gift for the first purchase after subscribing. */
export default async function TelegramSubscribe() {
  const t = await getTranslations("home.telegram");
  let info: Awaited<ReturnType<typeof getNewsSubscriptionInfo>>["data"] | null = null;
  try {
    info = (await getNewsSubscriptionInfo()).data;
  } catch {
    return null;
  }
  if (!info?.bot_url) return null;
  const coins = info.gift_coins ? info.gift_coins.toLocaleString("ru-RU").replace(/ /g, " ") : null;

  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0b3b5c_0%,#0e5f8a_45%,#1d9bd8_100%)] p-6 text-white shadow-2xl shadow-sky-900/25 sm:p-10">
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />
      <Send aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-6 h-56 w-56 -rotate-12 text-white/10" strokeWidth={1.25} />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Bell className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            {t("eyebrow")}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{coins ? t("titleGift", { coins }) : t("title")}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">{t("subtitle")}</p>
          <ul className="mt-5 grid max-w-lg gap-2 text-sm text-white/90 sm:grid-cols-2">
            {(["p1", "p2", "p3", "p4"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-200" strokeWidth={2.25} aria-hidden="true" />
                {t(k)}
              </li>
            ))}
          </ul>
          <a href={info.bot_url} target="_blank" rel="noopener" className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-sky-700 shadow-lg transition-transform hover:-translate-y-0.5">
            <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.5} aria-hidden="true" />
            {t("cta")}
          </a>
          {info.subscribers > 9 && <p className="mt-3 text-xs text-white/70">{t("subscribers", { count: info.subscribers })}</p>}
        </div>

        {coins && (
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rotate-[-3deg] rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md transition-transform duration-500 hover:rotate-0">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-900 shadow-lg">
                <Gift className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-white/70">{t("giftLabel")}</p>
              <p className="mt-1 text-4xl font-black tabular-nums">
                +{coins} <span className="text-lg font-bold text-amber-200">coin</span>
              </p>
              <p className="mt-2 text-sm text-white/75">{t("giftText")}</p>
              <ol className="mt-4 space-y-1.5 text-xs text-white/80">
                {(["s1", "s2", "s3"] as const).map((k, i) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">{i + 1}</span>
                    {t(k)}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
