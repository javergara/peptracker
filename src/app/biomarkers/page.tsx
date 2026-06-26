import { Suspense } from "react";

import { listBiomarkers } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { BiomarkerBrowser } from "@/components/biomarkers/biomarker-browser";
import { asStringArray } from "@/types/peptide";
import type { BiomarkerSystem } from "@/types/biomarker";

export const metadata = {
  title: "Biomarkers",
  description:
    "A cited reference for the markers you track — mechanisms, ranges, and what to do about them.",
};

export default async function BiomarkersPage() {
  const raw = await listBiomarkers();

  // Serialize Json columns server-side so the browser component receives plain types.
  const biomarkers = raw.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    system: b.system as BiomarkerSystem,
    unit: b.unit,
    summary: b.summary,
    aliases: asStringArray(b.aliases),
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Biomarkers"
        description="A cited reference for the markers you track."
      />
      <Disclaimer />
      <Suspense>
        <BiomarkerBrowser biomarkers={biomarkers} />
      </Suspense>
    </div>
  );
}
