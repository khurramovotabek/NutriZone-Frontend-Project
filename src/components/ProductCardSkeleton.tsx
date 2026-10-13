import { Skeleton } from "@/components/ui";

/**
 * Mirrors ProductCard's own real structure exactly (media -> brand ->
 * title -> rating -> price -> CTA) so a loading grid never jumps once
 * real cards replace it -- never a generic spinner in place of this.
 */
export default function ProductCardSkeleton({ variant = "standard" }: { variant?: "standard" | "featured" | "compact" }) {
  const isFeatured = variant === "featured";
  return (
    <div className="nz-glass overflow-hidden rounded-xl p-3">
      <Skeleton className={`w-full rounded-lg ${isFeatured ? "aspect-[4/5]" : "aspect-square"}`} />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}
