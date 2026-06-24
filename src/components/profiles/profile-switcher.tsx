import { getActiveUser, getAllUsers } from "@/lib/active-user";

import { ProfileMenu } from "./profile-menu";

/** Server island: loads profiles + active profile, renders the client menu. */
export async function ProfileSwitcher() {
  const [users, active] = await Promise.all([getAllUsers(), getActiveUser()]);
  return (
    <ProfileMenu
      users={users.map((u) => ({ id: u.id, name: u.name, color: u.color }))}
      activeId={active.id}
    />
  );
}
