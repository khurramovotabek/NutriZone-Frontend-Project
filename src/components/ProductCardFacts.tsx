import { Calculator, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";

const money = (v: number) => Math.round(v).toLocaleString("ru-RU").replace(/ /g, " ");

/**
 * "Hisob-kitob" + "Kimga mos" on the product page: price per serving, price of 25 g protein (the fair way to compare
 * tubs) and who the product suits -- only what the backend could read from the card (card_numbers.py), never guessed.
 */
export default function ProductCardFacts({ facts }: { facts: ProductCard["card_facts"] }) {
  const t = useTranslations("product.cardFacts");
  if (!facts) return null;
  const numbers: string[] = [];
  if (facts.servings) numbers.push(t("servings", { n: facts.servings }));
  if (facts.protein) numbers.push(t("protein", { g: facts.protein }));
  if (facts.per_serving) numbers.push(t("perServing", { price: money(facts.per_serving) }));
  const suits = (facts.suits ?? []).filter((s) => t.has(`suits.${s}`));
  if (!numbers.length && !facts.per_25g_protein && !suits.length) return null;

  return (
    <div className="nz-glass mb-3 rounded-2xl p-4">
      {(numbers.length > 0 || facts.per_25g_protein) && (
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Calculator className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
            {t("title")}
            {facts.size && <span className="font-normal normal-case tracking-normal">· {t("forSize", { size: facts.size })}</span>}
          </p>
          {facts.per_25g_protein ? (
            <p className="mt-2 text-lg font-bold text-ink">{t("per25g", { price: money(facts.per_25g_protein) })}</p>
          ) : null}
          {numbers.length > 0 && <p className="mt-1 text-sm text-ink-muted">{numbers.join(" · ")}</p>}
        </div>
      )}
      {suits.length > 0 && (
        <div className={numbers.length > 0 || facts.per_25g_protein ? "mt-3 border-t border-border pt-3" : ""}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
            {t("suitsTitle")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {suits.map((s) => (
              <li key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                {t(`suits.${s}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
