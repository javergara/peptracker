import { Suspense } from "react";

import { listPeptides } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { PeptideBrowser } from "@/components/peptides/peptide-browser";

export const metadata = {
  title: "Peptides Knowledge Base",
  description:
    "Research compounds reference: mechanisms, dosing, interactions, and more.",
};

export default async function PeptidesPage() {
  const peptides = await listPeptides();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Peptides Knowledge Base"
        description="Research-grade reference for mechanisms, dosing protocols, and interactions."
      />
      <Disclaimer />
      <Suspense>
        <PeptideBrowser peptides={peptides} />
      </Suspense>
    </div>
  );
}
