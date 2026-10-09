import { can, type Viewer } from "@/modules/access";

import type { EquipmentCaps } from "./types";

// Τι δικαιούται ο θεατής στον Εξοπλισμό. Εδώ, και όχι στα helpers, γιατί φέρνει το module πρόσβασης (server)·
// τα components-πελάτες παίρνουν τις καθαρές συναρτήσεις του helpers.ts.

export const equipmentCaps = (viewer: Viewer): EquipmentCaps => ({
  canView: can(viewer, "equipment.view"),
  canManage: can(viewer, "equipment.manage"),
  canEditTemplates:
    can(viewer, "equipment.reserve") || can(viewer, "equipment.manage"),
});
