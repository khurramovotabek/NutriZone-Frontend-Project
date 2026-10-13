import { Skeleton } from "@/components/ui";

/** Mirrors stores/page.tsx's real header + filter chips + card grid. */
export default function StoresLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="nz-glass overflow-hidden rounded-xl">
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
