import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={4} columns={2} maxWidth="max-w-4xl" />;
}
