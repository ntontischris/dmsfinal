// Τι βλέπει και τι αλλάζει ο κάθε ρόλος στο module «2 Κατάλογος».
// Πηγή: 01-roles-and-permissions.md (πίνακας Δικαιωμάτων) και 08-role-guides.md (C1, C2).
// Το «Διαχειρίζεται κόστος» το έχει αρχικά μόνο ο Ιδιοκτήτης (ADR 0017): η Διαχείριση βλέπει ώρες και κόστος, δεν τα αλλάζει.

import type { RoleId } from "@/data/roles";

export interface CatalogueCaps {
  canManage: boolean;
  canSeeCost: boolean;
  canManageCost: boolean;
  canSeeArchived: boolean;
  isReadOnly: boolean;
}

export const catalogueCapsOf = (role: RoleId): CatalogueCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  return {
    canManage: isAdminLike,
    canSeeCost: isAdminLike,
    canManageCost: role === "owner",
    canSeeArchived: isAdminLike,
    isReadOnly: !isAdminLike,
  };
};
