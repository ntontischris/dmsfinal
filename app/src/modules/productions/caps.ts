import { can, type Viewer } from "@/modules/access";

import type { ProductionsCaps } from "./types";

// Τι δικαιούται ο θεατής στις Παραγωγές. Εδώ, και όχι στα helpers, γιατί φέρνει το module πρόσβασης (server)·
// τα components-πελάτες παίρνουν τις καθαρές συναρτήσεις του helpers.ts.
// Τις ενέργειες της σελίδας (παράδοση, μέλη, μεταβίβαση) τις δίνει η βάση στο viewerCan της κάθε Παραγωγής.

export const productionsCaps = (viewer: Viewer): ProductionsCaps => ({
  canView: can(viewer, "productions.manage"),
  canCreateInternal:
    viewer.status === "signed-in" &&
    viewer.team?.permissions["productions.manage"] === "all",
});
