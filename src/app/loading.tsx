import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={2} columns={3} rows={5} maxWidth="max-w-6xl" />;
}
