import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { DataControls } from "@/components/settings/data-controls";
import { ProfilesCard } from "@/components/profiles/profiles-card";
import { ReminderSettings } from "@/components/pwa/reminder-settings";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { updateUserSettings } from "@/lib/actions/settings";
import { getCurrentUser } from "@/lib/queries";

export const metadata = { title: "Settings" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Preferences and your data."
        accentColor={user.color ?? undefined}
      />

      <div className="mb-6">
        <ProfilesCard />
      </div>

      <ReminderSettings />

      <div className="card-surface mb-6 rounded-2xl p-6">
        <Eyebrow className="mb-4">Active profile &amp; units</Eyebrow>
        <form action={updateUserSettings} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <input name="name" defaultValue={user.name} className={inputCls} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Weight unit</label>
              <select
                name="weightUnit"
                defaultValue={user.weightUnit}
                className={inputCls}
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dose unit</label>
              <select
                name="doseUnit"
                defaultValue={user.doseUnit}
                className={inputCls}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-sex" className="text-sm font-medium">
                Sex
              </label>
              <select
                id="set-sex"
                name="sex"
                defaultValue={user.sex ?? ""}
                className={inputCls}
              >
                <option value="">Prefer not to say</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-birthyear" className="text-sm font-medium">
                Birth year
              </label>
              <input
                id="set-birthyear"
                name="birthYear"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={user.birthYear ?? ""}
                placeholder="e.g. 1990"
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Sex and birth year are used to show sex- and age-appropriate
            biomarker reference ranges. Optional.
          </p>
          <Button type="submit">Save settings</Button>
        </form>
      </div>

      <div className="card-surface mb-6 rounded-2xl p-6">
        <Eyebrow className="mb-4">Data</Eyebrow>
        <DataControls />
      </div>

      <Disclaimer />
    </div>
  );
}

export const dynamic = "force-dynamic";
