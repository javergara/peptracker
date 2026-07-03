import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={4} columns={1} maxWidth="max-w-2xl" />;
}
