import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={2} columns={1} rows={4} maxWidth="max-w-4xl" />;
}
