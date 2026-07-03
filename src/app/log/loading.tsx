import { PageSkeleton } from "@/components/common/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton variant="form" fields={7} rows={5} maxWidth="max-w-4xl" />
  );
}
