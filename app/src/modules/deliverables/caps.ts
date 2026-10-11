import { can, type Viewer } from "@/modules/access";

import type { DeliverablesCaps } from "./types";

// Τι δικαιούται ο θεατής στα Παραδοτέα. Εδώ, γιατί φέρνει το module πρόσβασης (server)·
// τα components-πελάτες παίρνουν τις καθαρές συναρτήσεις του helpers.ts.

export const deliverablesCaps = (viewer: Viewer): DeliverablesCaps => {
  const canWork = can(viewer, "deliverables.work");
  const canReview = can(viewer, "deliverables.review");
  return {
    canWork,
    canReview,
    canQueue: canWork || canReview,
    // Η ουρά «Χρεώνεται» είναι για όλες τις Παραγωγές: θέλει «Βλέπει ποσά» με Εύρος «όλα» (όπως η βάση).
    canSeeCharges: viewer.status === "signed-in" && viewer.team?.permissions["finance.amounts"] === "all",
    canSeeAmounts: can(viewer, "finance.amounts"),
  };
};
