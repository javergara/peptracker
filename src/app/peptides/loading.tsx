import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={6} columns={3} />;
}
