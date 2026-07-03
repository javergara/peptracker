import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton variant="form" fields={4} rows={3} maxWidth="max-w-3xl" />
  );
}
