import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLoyaltyTiers, type LoyaltyTier } from "@/lib/loyalty-api";
import ContactSpotlight from "@/components/contact/ContactSpotlight";
import LoyaltyExperience from "@/components/loyalty/LoyaltyExperience";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loyalty");
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function LoyaltyPage() {
  const t = await getTranslations("loyalty");
  const tNav = await getTranslations("navigation");

  let tiers: LoyaltyTier[] = [];
  try {
    tiers = (await getLoyaltyTiers()).data;
  } catch {
    // The tier ladder is informational -- the wallet part still loads on its own.
  }

  return (
    <ContactSpotlight className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="nz-orb left-[-8%] top-[-6%] h-[420px] w-[420px] bg-amber-400/20" />
        <div className="nz-orb right-[-10%] top-[20%] h-[460px] w-[460px] bg-primary/20" style={{ animationDelay: "-7s" }} />
        <div className="nz-orb bottom-[0%] left-[25%] h-[360px] w-[360px] bg-emerald-500/10" style={{ animationDelay: "-13s" }} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-1.5 text-xs text-ink-muted">
          <Link href="/" className="transition-colors hover:text-primary">
            {tNav("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-ink">
            {t("title")}
          </span>
        </nav>

        <LoyaltyExperience tiers={tiers} />
      </div>
    </ContactSpotlight>
  );
}
