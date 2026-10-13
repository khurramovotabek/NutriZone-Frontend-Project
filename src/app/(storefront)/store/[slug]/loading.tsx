import { Skeleton } from "@/components/ui";

/** Mirrors store/[slug]/page.tsx's real cover + identity bar + two-column layout. */
export default function StoreDetailLoading() {
  return (
    <div className="pb-16">
      <Skeleton className="h-56 w-full rounded-none sm:h-72" />

      <div className="mx-auto max-w-5xl px-4">
        <div className="relative -mt-10 flex items-end gap-4 sm:-mt-12">
          <Skeleton className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Skeleton className="my-6 h-4 w-48" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-6 h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
