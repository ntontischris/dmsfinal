import { can, type Viewer } from "@/modules/access";

// Τι δικαιούται ο θεατής στο Ημερολόγιο. Η βάση ξαναελέγχει τα πάντα· εδώ μόνο κρύβεται ή φαίνεται.
// Το «Κλείνει χρόνο άλλων» έρχεται από τη βάση μαζί με τα δεδομένα (canBlockOthers), όχι από εδώ.

export interface CalendarCaps {
  canSee: boolean;
  isTeam: boolean;
}

export const calendarCaps = (viewer: Viewer): CalendarCaps => {
  const isTeam = viewer.status === "signed-in" && viewer.team !== null;
  return {
    canSee: isTeam || can(viewer, "c.book"),
    isTeam,
  };
};
