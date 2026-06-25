import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={2} columns={2} maxWidth="max-w-5xl" />;
}
