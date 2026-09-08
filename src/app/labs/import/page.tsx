import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { LabPdfImport } from "@/components/labs/lab-pdf-import";
import { listBiomarkers } from "@/lib/queries";

export const metadata = { title: "Import Labs from PDF" };
export const dynamic = "force-dynamic";

export default async function LabImportPage() {
  const biomarkers = await listBiomarkers();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/labs"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        ← Back to Labs
      </Link>

      <PageHeader
        title="Import labs from PDF"
        description="Upload a lab-report PDF, review the extracted values, then save them to your profile."
      />

      <Disclaimer className="mb-6" />

      <LabPdfImport
        biomarkers={biomarkers.map((b) => ({
          slug: b.slug,
          name: b.name,
          system: b.system,
        }))}
      />
    </div>
  );
}
