import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { DataControls } from "@/components/settings/data-controls";
import { ProfilesCard } from "@/components/profiles/profiles-card";
import { ReminderSettings } from "@/components/pwa/reminder-settings";
import { Disclaimer } from "@/components/disclaimer";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserSettings } from "@/lib/actions/settings";
import { getCurrentUser } from "@/lib/queries";

export const metadata = { title: "Settings" };

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
        <ActionForm
          action={updateUserSettings}
          success="Settings saved"
          resetOnSuccess={false}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="set-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="set-name"
              name="name"
              defaultValue={user.name}
              required
              maxLength={80}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="set-weight-unit" className="text-sm font-medium">
                Weight unit
              </label>
              <Select name="weightUnit" defaultValue={user.weightUnit}>
                <SelectTrigger id="set-weight-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-dose-unit" className="text-sm font-medium">
                Dose unit
              </label>
              <Select name="doseUnit" defaultValue={user.doseUnit}>
                <SelectTrigger id="set-dose-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-sex" className="text-sm font-medium">
                Sex
              </label>
              <Select
                name="sex"
                defaultValue={user.sex ?? ""}
                items={{
                  "": "Prefer not to say",
                  M: "Male",
                  F: "Female",
                  other: "Other",
                }}
              >
                <SelectTrigger id="set-sex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Prefer not to say</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-birthyear" className="text-sm font-medium">
                Birth year
              </label>
              <Input
                id="set-birthyear"
                name="birthYear"
                type="number"
                inputMode="numeric"
                step="1"
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={user.birthYear ?? ""}
                placeholder="e.g. 1990"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Sex and birth year are used to show sex- and age-appropriate
            biomarker reference ranges. Optional.
          </p>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
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
