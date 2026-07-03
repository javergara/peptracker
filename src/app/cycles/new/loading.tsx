import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return <PageSkeleton variant="form" fields={6} maxWidth="max-w-2xl" />;
}
