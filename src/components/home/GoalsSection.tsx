import Link from "next/link";
import { Activity, ArrowRight, Dumbbell, Flame, HeartPulse } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getGoals } from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";

const STYLE = {
  muscle: { icon: Dumbbell, bg: "from-blue-600 via-indigo-600 to-violet-700", glow: "bg-indigo-400/40" },
  weight_loss: { icon: Flame, bg: "from-orange-500 via-rose-500 to-pink-600", glow: "bg-orange-300/40" },
  endurance: { icon: Activity, bg: "from-emerald-500 via-teal-600 to-cyan-700", glow: "bg-emerald-300/40" },
  health: { icon: HeartPulse, bg: "from-fuchsia-500 via-purple-600 to-indigo-700", glow: "bg-fuchsia-300/40" },
} as const;

/** Shop by goal: four large cards (muscle, weight loss, endurance, health) leading into the catalogue filtered by that goal. */
export default async function GoalsSection() {
  const t = await getTranslations("home.goals");
  let goals: Awaited<ReturnType<typeof getGoals>>["data"] = [];
  try {
    goals = (await getGoals()).data;
  } catch {
    return null;
  }
  if (goals.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-16">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        {goals.map((g) => {
          const st = STYLE[g.code] ?? STYLE.muscle;
          const Icon = st.icon;
          return (
            <li key={g.code}>
              <Link
                href={g.count ? `/products?goal=${g.code}` : "/products"}
                className={`group relative flex h-full min-h-[150px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${st.bg} p-4 text-white sm:min-h-[230px] sm:rounded-3xl sm:p-6 shadow-xl shadow-black/10 transition-transform duration-300 hover:-translate-y-1`}
              >
                <span aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl ${st.glow}`} />
                <Icon aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 text-white/10 sm:h-40 sm:w-40 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" strokeWidth={1.25} />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-1 ring-white/25 sm:h-12 sm:w-12 sm:rounded-2xl">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="relative mt-3 text-base font-extrabold leading-tight sm:mt-5 sm:text-xl">{t(`${g.code}.title`)}</span>
                <span className="relative mt-1.5 hidden text-sm leading-relaxed text-white/80 sm:block">{t(`${g.code}.text`)}</span>
                <span className="relative mt-auto flex items-center justify-between gap-2 pt-3 text-sm font-bold sm:pt-5">
                  <span className="whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[11px] backdrop-blur sm:text-xs">{g.count ? t("count", { count: g.count }) : t("soon")}</span>
                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition-transform group-hover:translate-x-1 sm:flex">
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
