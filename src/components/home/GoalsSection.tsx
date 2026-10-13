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
    <section className="mt-16">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {goals.map((g) => {
          const st = STYLE[g.code] ?? STYLE.muscle;
          const Icon = st.icon;
          return (
            <li key={g.code}>
              <Link
                href={g.count ? `/products?goal=${g.code}` : "/products"}
                className={`group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${st.bg} p-6 text-white shadow-xl shadow-black/10 transition-transform duration-300 hover:-translate-y-1`}
              >
                <span aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl ${st.glow}`} />
                <Icon aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 text-white/10 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" strokeWidth={1.25} />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-1 ring-white/25">
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="relative mt-5 text-xl font-extrabold leading-tight">{t(`${g.code}.title`)}</span>
                <span className="relative mt-1.5 text-sm leading-relaxed text-white/80">{t(`${g.code}.text`)}</span>
                <span className="relative mt-auto flex items-center justify-between pt-5 text-sm font-bold">
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs backdrop-blur">{g.count ? t("count", { count: g.count }) : t("soon")}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 transition-transform group-hover:translate-x-1">
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
