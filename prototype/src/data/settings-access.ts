// Τι βλέπει και τι μπορεί ο κάθε ρόλος στις Ρυθμίσεις (O1–O7) και στα Διατομεακά (P1, P2).
// Πηγές: κεφ. 5 «Ρυθμίσεις», κεφ. 1 (κατάλογος Δικαιωμάτων), ADR 0015, ADR 0017, ADR 0018.

import type { RoleId } from "@/data/roles";

export { TODAY } from "@/data/sales";

export interface SettingsCaps {
  canManageSettings: boolean;
  isOwner: boolean;
  canManageCost: boolean;
  seesCostTotals: boolean;
  seesAmounts: boolean;
  seesAudit: boolean;
  seesHealth: boolean;
  canExport: boolean;
}

// Ιδιοκτήτης: όλα. Διαχείριση: όλα εκτός από τα «μόνο Ιδιοκτήτης» και το «Διαχειρίζεται κόστος».
export const settingsCapsOf = (role: RoleId): SettingsCaps => {
  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  return {
    canManageSettings: isOwner || isAdmin,
    isOwner,
    canManageCost: isOwner,
    seesCostTotals: isOwner || isAdmin,
    seesAmounts:
      isOwner || isAdmin || role === "sales" || role === "accountant",
    seesAudit: isOwner || isAdmin,
    seesHealth: isOwner || isAdmin,
    canExport: isOwner || isAdmin || role === "accountant",
  };
};

// Ο Χρήστης πίσω από κάθε ρόλο, όπως γράφεται στο Ίχνος.
export const ACTOR_NAME: Readonly<Partial<Record<RoleId, string>>> = {
  owner: "Γιώργος Μαυρίδης",
  admin: "Δημήτρης Ιωάννου",
};

// «Άνοιγμα σε πελάτες»: έγινε από τον Ιδιοκτήτη. Ο κόσμος του σεναρίου είναι μετά από αυτό.
export const OPENED_ON = "2026-06-15";
