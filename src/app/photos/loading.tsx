import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={8} columns={4} maxWidth="max-w-5xl" />;
}
