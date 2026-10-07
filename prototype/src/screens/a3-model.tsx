import { PROFILE_EXTRAS, type ProfileExtras } from "@/data/profile";
import type { RoleId } from "@/data/roles";
import {
  CLIENT_MEMBERSHIPS,
  CURRENT_CLIENT_USER,
  type ClientMembership,
} from "@/data/team";
import { actorOf, roleNames } from "@/data/team-access";

export interface ProfileView {
  key: string;
  name: string;
  email: string;
  roleLabel: string;
  isClient: boolean;
  extras: ProfileExtras;
  memberships: readonly ClientMembership[];
}

const CLIENT_NAME = "Μαρία Παπαδάκη";

const NO_EXTRAS: ProfileExtras = { hasGoogle: false, calendarToken: "" };

// Ο Χρήστης πίσω από τον ρόλο της εναλλαγής (ο Επισκέπτης δεν έχει προφίλ).
export const profileOf = (role: RoleId): ProfileView | undefined => {
  if (role === "client")
    return {
      key: CURRENT_CLIENT_USER,
      name: CLIENT_NAME,
      email: CURRENT_CLIENT_USER,
      roleLabel: "Πλήρης",
      isClient: true,
      extras: PROFILE_EXTRAS[CURRENT_CLIENT_USER] ?? NO_EXTRAS,
      memberships: CLIENT_MEMBERSHIPS.filter(
        (m) => m.email === CURRENT_CLIENT_USER,
      ),
    };
  const user = actorOf(role);
  if (!user) return undefined;
  return {
    key: user.id,
    name: user.name,
    email: user.email,
    roleLabel: roleNames(user.roleIds),
    isClient: false,
    extras: PROFILE_EXTRAS[user.id] ?? NO_EXTRAS,
    memberships: [],
  };
};
