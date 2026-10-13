import type { PosPerson } from "./types";

const SIZES = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" } as const;

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** A cashier's round badge: initials on their own stable colour (the same colour the Dashboard shows). */
export default function CashierAvatar({ person, size = "md", ring = false, title }: { person: Pick<PosPerson, "full_name" | "initials" | "color">; size?: keyof typeof SIZES; ring?: boolean; title?: string }) {
  return (
    <span
      title={title}
      style={{ backgroundColor: person.color || "#2563eb" }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${SIZES[size]} ${ring ? "ring-2 ring-[var(--color-bg)]" : ""}`}
      aria-hidden={title ? undefined : true}
    >
      {person.initials || initialsOf(person.full_name)}
    </span>
  );
}
