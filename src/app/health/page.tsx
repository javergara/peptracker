import { HeartPulse, Plus, Stethoscope, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { AddConditionForm } from "@/components/health/condition-form";
import { ConditionRow } from "@/components/health/condition-row";
import { AddFamilyHistoryForm } from "@/components/health/family-history-form";
import { FamilyHistoryRow } from "@/components/health/family-history-row";
import {
  groupConditionsByStatus,
  summarizeFamilyHistory,
} from "@/lib/health-profile";
import {
  listConditions,
  listFamilyHistory,
  getCurrentUser,
} from "@/lib/queries";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Health Profile" };
export const dynamic = "force-dynamic";

export default async function HealthProfilePage() {
  const [conditionRows, familyRows, user] = await Promise.all([
    listConditions(),
    listFamilyHistory(),
    getCurrentUser(),
  ]);

  const accentColor = user.color ?? undefined;

  // Parse Json columns into typed shapes for the client rows.
  const conditions = conditionRows.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    status: c.status,
    system: c.system,
    onsetDate: c.onsetDate,
    notes: c.notes,
    biomarkerSlugs: asStringArray(c.biomarkerSlugs),
    relatedPeptides: asStringArray(c.relatedPeptides),
  }));
  const familyEntries = familyRows.map((f) => ({
    id: f.id,
    relative: f.relative,
    condition: f.condition,
    notes: f.notes,
  }));

  const conditionGroups = groupConditionsByStatus(conditions);
  const familyGroups = summarizeFamilyHistory(familyEntries);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Health Profile"
        description="Your conditions and family history — the context behind your protocols. Educational record-keeping, not a diagnosis."
        accentColor={accentColor}
      />

      <Disclaimer className="mb-6" />

      {/* --- Conditions --- */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <Stethoscope className="text-muted-foreground size-4" />
          <h2 className="text-lg font-semibold tracking-tight">Conditions</h2>
        </div>

        <div className="card-surface mb-6 rounded-[18px]">
          <div className="border-border border-b px-5 pt-4 pb-3">
            <Eyebrow className="mb-1">New condition</Eyebrow>
            <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Plus className="size-4" />
              Add a condition or diagnosis
            </h3>
          </div>
          <div className="px-5 py-4">
            <AddConditionForm />
          </div>
        </div>

        {conditionGroups.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="size-6" />}
            title="No conditions yet"
            description="Add a condition above to keep the context behind your labs and protocols in one place."
          />
        ) : (
          <div className="space-y-6">
            {conditionGroups.map((group) => (
              <div key={group.status} className="space-y-3">
                <Eyebrow>
                  {group.label} · {group.items.length}
                </Eyebrow>
                {group.items.map((condition) => (
                  <ConditionRow key={condition.id} condition={condition} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- Family history --- */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="text-muted-foreground size-4" />
          <h2 className="text-lg font-semibold tracking-tight">
            Family history
          </h2>
        </div>

        <div className="card-surface mb-6 rounded-[18px]">
          <div className="border-border border-b px-5 pt-4 pb-3">
            <Eyebrow className="mb-1">New entry</Eyebrow>
            <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Plus className="size-4" />
              Add a relative&apos;s condition
            </h3>
          </div>
          <div className="px-5 py-4">
            <AddFamilyHistoryForm />
          </div>
        </div>

        {familyGroups.length === 0 ? (
          <EmptyState
            icon={<HeartPulse className="size-6" />}
            title="No family history yet"
            description="Record relatives' conditions to keep hereditary risk context alongside your data."
          />
        ) : (
          <div className="space-y-4">
            {familyGroups.map((group) => (
              <div key={group.relative} className="card-surface rounded-[18px]">
                <div className="border-border border-b px-5 py-3">
                  <Eyebrow>{group.label}</Eyebrow>
                </div>
                <div className="px-5 py-1">
                  {group.items.map((entry) => (
                    <FamilyHistoryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
