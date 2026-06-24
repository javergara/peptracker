import { PageHeader } from "@/components/common/page-header";
import { DataControls } from "@/components/settings/data-controls";
import { ProfilesCard } from "@/components/profiles/profiles-card";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserSettings } from "@/lib/actions/settings";
import { getCurrentUser } from "@/lib/queries";

export const metadata = { title: "Settings" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Preferences and your data." />

      <div className="mb-6">
        <ProfilesCard />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Active profile & units</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUserSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <input
                name="name"
                defaultValue={user.name}
                className={inputCls}
              />
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
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataControls />
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}

export const dynamic = "force-dynamic";
