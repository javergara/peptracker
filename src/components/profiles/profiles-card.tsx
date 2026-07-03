import { UserPlus } from "lucide-react";

import { getActiveUser, getAllUsers } from "@/lib/active-user";
import { createProfile, updateProfile } from "@/lib/actions/profiles";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DeleteProfileButton } from "./delete-profile-button";

export async function ProfilesCard() {
  const [users, active] = await Promise.all([getAllUsers(), getActiveUser()]);

  return (
    <Card id="profiles">
      <CardHeader>
        <CardTitle>Profiles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Track multiple people (e.g. yourself and your partner). Each profile
          has its own cycles, dose logs, and metrics. Switch the active profile
          from the sidebar. Currently active: <strong>{active.name}</strong>.
        </p>

        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-lg border p-3">
              <ActionForm
                action={updateProfile}
                success="Profile saved"
                resetOnSuccess={false}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={u.id} />
                <input
                  type="color"
                  name="color"
                  defaultValue={u.color ?? "#6366f1"}
                  aria-label="Profile color"
                  className="border-input h-9 w-10 cursor-pointer rounded-lg border bg-transparent p-1"
                />
                <Input
                  name="name"
                  defaultValue={u.name}
                  required
                  maxLength={60}
                  className="min-w-40 flex-1"
                />
                {u.id === active.id ? (
                  <Badge variant="secondary">Active</Badge>
                ) : null}
                <SubmitButton variant="outline" size="sm">
                  Save
                </SubmitButton>
                <DeleteProfileButton
                  id={u.id}
                  name={u.name}
                  disabled={users.length <= 1}
                />
              </ActionForm>
            </li>
          ))}
        </ul>

        <ActionForm
          action={createProfile}
          success="Profile added"
          className="flex flex-wrap items-center gap-2 border-t pt-4"
        >
          <input
            type="color"
            name="color"
            defaultValue="#A855F7"
            aria-label="New profile color"
            className="border-input h-9 w-10 cursor-pointer rounded-lg border bg-transparent p-1"
          />
          <Input
            name="name"
            required
            placeholder="New profile name"
            maxLength={60}
            className="min-w-40 flex-1"
          />
          <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="makeActive" defaultChecked />
            Switch to it
          </label>
          <SubmitButton>
            <UserPlus className="size-4" />
            Add profile
          </SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
