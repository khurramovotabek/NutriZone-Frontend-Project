import { Building2, Bus, History, Landmark, MapPinned, Milestone, TrainFront } from "lucide-react";
import type { PlaceKind } from "@/lib/geo-locate";

const ICONS = { metro: TrainFront, stop: Bus, building: Building2, street: Milestone, area: MapPinned, place: Landmark, recent: History } as const;
const TONES: Record<string, string> = {
  metro: "bg-sky-500/12 text-sky-600 dark:text-sky-300", stop: "bg-teal-500/12 text-teal-600 dark:text-teal-300",
  building: "bg-primary/12 text-primary", street: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  area: "bg-violet-500/12 text-violet-600 dark:text-violet-300", place: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  recent: "bg-ink/8 text-ink-muted",
};

/** The round badge in front of a map search result: what kind of place it is (metro, a building, a street...). */
export default function PlaceKindIcon({ kind }: { kind: PlaceKind | "recent" | string }) {
  const k = (kind in ICONS ? kind : "place") as keyof typeof ICONS;
  const Icon = ICONS[k];
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[k]}`} aria-hidden="true">
      <Icon className="h-4 w-4" />
    </span>
  );
}
