import { can, type Viewer } from "@/modules/access";

import type { FilmingCaps } from "./types";

// Τι δικαιούται ο θεατής στα Γυρίσματα. Εδώ, και όχι στα helpers, γιατί φέρνει το module πρόσβασης (server)·
// τα components-πελάτες παίρνουν τις καθαρές συναρτήσεις του helpers.ts.
// Κάθε ενέργεια της σελίδας την ξαναελέγχει η βάση· εδώ μόνο φαίνεται ή κρύβεται.

export const filmingCaps = (viewer: Viewer): FilmingCaps => ({
  canView: can(viewer, "filming.view") || can(viewer, "c.book"),
  canApprove: can(viewer, "filming.approve"),
  canBook: can(viewer, "filming.book"),
  canCrew: can(viewer, "filming.crew"),
  canReserve: can(viewer, "equipment.reserve"),
  canManageSettings: can(viewer, "settings.manage"),
  canBookInternal:
    viewer.status === "signed-in" && viewer.team?.permissions["filming.book"] === "all",
});
