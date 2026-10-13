import {
  Bell, CircleCheck, CircleX, Coins, Crown, Gift, Hourglass, Megaphone, Package, PackageCheck, ShoppingCart, Sparkles, Store, TicketPercent,
  CreditCard, MessageCircle, ShieldAlert, ShoppingBag, Star, TriangleAlert, Trophy, Truck, Undo2, type LucideIcon,
} from "lucide-react";
import type { InboxTone } from "@/lib/notifications-api";

const ICONS: Record<string, LucideIcon> = {
  "package-check": PackageCheck, package: Package, truck: Truck, "circle-check": CircleCheck, "circle-x": CircleX,
  "undo-2": Undo2, "triangle-alert": TriangleAlert, coins: Coins, trophy: Trophy, crown: Crown, gift: Gift,
  hourglass: Hourglass, "ticket-percent": TicketPercent, sparkles: Sparkles, megaphone: Megaphone, bell: Bell, "shopping-cart": ShoppingCart,
  store: Store, "shield-alert": ShieldAlert, "credit-card": CreditCard, "message-circle": MessageCircle, star: Star,
  "shopping-bag": ShoppingBag,
};

// Soft glass tiles per tone -- readable on both themes.
const TONES: Record<InboxTone, string> = {
  success: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
  info: "bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-400",
  warning: "bg-amber-500/15 text-amber-600 ring-amber-500/25 dark:text-amber-400",
  danger: "bg-rose-500/15 text-rose-600 ring-rose-500/25 dark:text-rose-400",
  primary: "bg-blue-500/15 text-blue-600 ring-blue-500/25 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 ring-violet-500/25 dark:text-violet-400",
  neutral: "bg-slate-500/15 text-slate-600 ring-slate-500/25 dark:text-slate-300",
};

export default function InboxIcon({ icon, tone, size = "md" }: { icon: string; tone: InboxTone; size?: "sm" | "md" }) {
  const Icon = ICONS[icon] ?? Bell;
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";
  return (
    <span className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${box} ${TONES[tone] ?? TONES.primary}`}>
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}
