import { ScanLine, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { AddStudyForm } from "@/components/studies/study-form";
import { StudyRow, type StudyRowData } from "@/components/studies/study-row";
import { listStudies, getCurrentUser } from "@/lib/queries";
import { groupStudiesByStatus } from "@/lib/studies";
import { STUDY_STATUS_LABELS } from "@/types/study";

export const metadata = { title: "Studies" };
export const dynamic = "force-dynamic";

export default async function StudiesPage() {
  const [studyRows, user] = await Promise.all([
    listStudies(),
    getCurrentUser(),
  ]);

  const accentColor = user.color ?? undefined;

  const studies: StudyRowData[] = studyRows.map((s) => ({
    id: s.id,
    name: s.name,
    modality: s.modality,
    status: s.status,
    bodyRegion: s.bodyRegion,
    performedAt: s.performedAt,
    followUpAt: s.followUpAt,
    findings: s.findings,
    impression: s.impression,
    notes: s.notes,
  }));

  // Pending work (scheduled / follow-up) surfaces above completed studies.
  const groups = groupStudiesByStatus(studies);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Imaging & studies"
        description="Ultrasounds, scans, and procedures with their findings and follow-ups. Educational record-keeping, not medical advice."
        accentColor={accentColor}
      />

      <Disclaimer className="mb-6" />

      <div className="card-surface mb-6 rounded-[18px]">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">New study</Eyebrow>
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Plus className="size-4" />
            Add a study
          </h3>
        </div>
        <div className="px-5 py-4">
          <AddStudyForm />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<ScanLine className="size-6" />}
          title="No studies yet"
          description="Add an imaging study or procedure above to keep its findings and follow-ups in one place."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.status} className="space-y-3">
              <Eyebrow>
                {STUDY_STATUS_LABELS[group.status]} · {group.items.length}
              </Eyebrow>
              {group.items.map((study) => (
                <StudyRow key={study.id} study={study} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
