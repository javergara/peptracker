import {
  SkeletonHeader,
  SkeletonHero,
  SkeletonCard,
  SkeletonRows,
} from "@/components/common/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl">
      <SkeletonHeader />

      {/* Cycle progress hero (InkPanel) */}
      <SkeletonHero className="mb-6" />

      {/* Log-a-dose form card */}
      <SkeletonCard className="mb-6" lines={4} />

      {/* Dose history card */}
      <div className="card-surface rounded-[18px] p-6">
        <Skeleton className="mb-4 h-4 w-40" />
        <SkeletonRows rows={5} />
      </div>
    </div>
  );
}
