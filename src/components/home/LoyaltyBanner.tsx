import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Gift, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getLoyaltyTiers } from "@/lib/loyalty-api";
import TierBadge from "@/components/loyalty/TierBadge";

/** NutriZone Coins on the home page: cashback on every purchase (online and at the branch tills), with the real tiers. */
export default async function LoyaltyBanner() {
  const t = await getTranslations("home.loyalty");
  let tiers: Awaited<ReturnType<typeof getLoyaltyTiers>>["data"] = [];
  try {
    tiers = (await getLoyaltyTiers()).data;
  } catch {
    tiers = [];
  }
  const all = [...tiers].sort((a, b) => Number(a.min_spend) - Number(b.min_spend));
  // The headline promises the best rate of the whole ladder; the list shows the first steps, how many are hidden, and the top tier.
  const top = all.length ? Math.max(...all.map((x) => Number(x.percent))) : null;
  const hidden = all.length > 5 ? all.length - 4 : 0;
  const sorted = hidden ? [...all.slice(0, 3), all[all.length - 1]] : all;

  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1c1407_0%,#3b2506_45%,#0f172a_100%)] p-6 text-white shadow-2xl shadow-amber-900/20 sm:p-10">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-400/30 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
            <Coins className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            NutriZone Coins
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {top ? t("titleTop", { percent: top }) : t("title")}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">{t("subtitle")}</p>
          <ul className="mt-5 grid max-w-lg gap-2.5 text-sm text-white/85 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Gift className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} aria-hidden="true" />
              {t("pointEarn")}
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} aria-hidden="true" />
              {t("pointGrow")}
            </li>
          </ul>
          <Link href="/loyalty" className="group mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3 text-sm font-extrabold text-slate-900 shadow-lg shadow-amber-500/30 transition-transform hover:-translate-y-0.5">
            {t("cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>

        {sorted.length > 0 && (
          <ol className="relative space-y-2.5">
            {sorted.map((tier, i) => (
              <Fragment key={tier.id}>
                {hidden > 0 && i === sorted.length - 1 && (
                  <li aria-hidden="true" className="flex items-center gap-2 py-0.5 text-[11px] font-semibold text-white/50" style={{ marginLeft: `${(i - 0.5) * 4}%` }}>
                    <span className="flex gap-1 pl-4">
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                    </span>
                    {t("more", { count: hidden })}
                  </li>
                )}
                <li className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm ${i === sorted.length - 1 && hidden ? "border-amber-300/40 bg-amber-300/[0.1]" : "border-white/10 bg-white/[0.06]"}`} style={{ marginLeft: `${i * 4}%` }}>
                  <TierBadge icon={tier.icon} color={tier.color || "#f59e0b"} size={36} className="shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{tier.name}</span>
                    <span className="block text-[11px] text-white/60">{t("from", { amount: Math.round(Number(tier.min_spend)).toLocaleString("ru-RU").replace(/ /g, " ") })}</span>
                  </span>
                  <span className="text-lg font-black tabular-nums text-amber-300">{Number(tier.percent)}%</span>
                </li>
              </Fragment>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
