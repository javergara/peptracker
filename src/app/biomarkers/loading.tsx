import { PageSkeleton } from "@/components/common/page-skeleton";

export default function BiomarkersLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageSkeleton cards={6} columns={3} />
    </div>
  );
}
