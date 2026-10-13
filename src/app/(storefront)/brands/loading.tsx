import { Skeleton } from "@/components/ui";

export default function BrandsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-6 h-40 w-full rounded-3xl" />
      <div className="mt-10 flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="nz-glass flex flex-col items-center gap-3 rounded-xl p-5">
            <Skeleton className="h-20 w-20 rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
