import {
  SkeletonHeader,
  SkeletonCard,
} from "@/components/common/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back nav */}
      <Skeleton className="h-4 w-32" />

      <SkeletonHeader />

      {/* Goal tag pills */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Disclaimer bar */}
      <Skeleton className="h-16 w-full rounded-[14px]" />

      {/* Tabs list */}
      <div className="flex gap-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Detail card grid */}
      <SkeletonCard lines={3} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}
