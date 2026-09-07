import { Pill, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { AddMedicationForm } from "@/components/medications/medication-form";
import {
  MedicationRow,
  type MedicationRowData,
} from "@/components/medications/medication-row";
import { listMedications, getCurrentUser } from "@/lib/queries";
import { asStringArray } from "@/types/peptide";
import {
  MEDICATION_STATUSES,
  MEDICATION_STATUS_LABELS,
  asMedicationStatus,
} from "@/types/medication";

export const metadata = { title: "Medications" };
export const dynamic = "force-dynamic";

export default async function MedicationsPage() {
  const [medicationRows, user] = await Promise.all([
    listMedications(),
    getCurrentUser(),
  ]);

  const accentColor = user.color ?? undefined;

  // Parse Json columns into typed shapes for the client rows.
  const medications: MedicationRowData[] = medicationRows.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    status: m.status,
    startDate: m.startDate,
    notes: m.notes,
    biomarkerSlugs: asStringArray(m.biomarkerSlugs),
    changes: m.changes.map((ch) => ({
      id: ch.id,
      dose: ch.dose,
      reason: ch.reason,
      effectiveAt: ch.effectiveAt,
    })),
  }));

  // Group by status so active meds surface above stopped ones.
  const groups = MEDICATION_STATUSES.map((status) => ({
    status,
    label: MEDICATION_STATUS_LABELS[status],
    items: medications.filter((m) => asMedicationStatus(m.status) === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Medications"
        description="Prescribed medications and how their dose has changed over time. Educational record-keeping, not medical advice."
        accentColor={accentColor}
      />

      <Disclaimer className="mb-6" />

      <div className="card-surface mb-6 rounded-[18px]">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">New medication</Eyebrow>
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Plus className="size-4" />
            Add a medication
          </h3>
        </div>
        <div className="px-5 py-4">
          <AddMedicationForm />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<Pill className="size-6" />}
          title="No medications yet"
          description="Add a medication above to track its dose and any changes over time."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.status} className="space-y-3">
              <Eyebrow>
                {group.label} · {group.items.length}
              </Eyebrow>
              {group.items.map((medication) => (
                <MedicationRow key={medication.id} medication={medication} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
