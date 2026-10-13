"use client";

import { Coins, MessageCircleQuestion, Package, RotateCcw, Sparkles, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export const SUPPORT_TOPICS = ["order", "delivery", "returns", "product", "coins"] as const;
type Topic = (typeof SUPPORT_TOPICS)[number];

const TOPIC_ICONS: Record<Topic, LucideIcon> = { order: Package, delivery: Truck, returns: RotateCcw, product: Sparkles, coins: Coins };

/**
 * Ready-made opening messages for common support questions. `onPick` gets the
 * localized message text (never sent automatically -- it lands in the composer
 * for the customer to edit and send).
 */
export default function SupportTopics({ onPick, variant = "chips", disabled = false }: { onPick: (text: string) => void; variant?: "chips" | "cards"; disabled?: boolean }) {
  const t = useTranslations("account.chatPage");

  if (variant === "cards") {
    return (
      <div>
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <MessageCircleQuestion className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {t("topicsTitle")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUPPORT_TOPICS.map((topic) => {
            const Icon = TOPIC_ICONS[topic];
            return (
              <button
                key={topic}
                type="button"
                disabled={disabled}
                onClick={() => onPick(t(`topics.${topic}.text`))}
                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/50 px-3.5 py-3 text-left text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft disabled:opacity-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                </span>
                {t(`topics.${topic}.title`)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-3 pb-2 pt-1 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
      {SUPPORT_TOPICS.map((topic) => {
        const Icon = TOPIC_ICONS[topic];
        return (
          <button
            key={topic}
            type="button"
            disabled={disabled}
            onClick={() => onPick(t(`topics.${topic}.text`))}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3 py-1.5 text-xs font-medium text-ink-muted backdrop-blur-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
            {t(`topics.${topic}.title`)}
          </button>
        );
      })}
    </div>
  );
}
