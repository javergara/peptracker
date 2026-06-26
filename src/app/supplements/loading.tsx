import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={3} columns={3} maxWidth="max-w-4xl" />;
}
