import type { Viewer } from "@/modules/access";

// Τι δικαιούται ο θεατής στο Ημερολόγιο. Η βάση ξαναελέγχει τα πάντα· εδώ μόνο κρύβεται ή φαίνεται.
// Βλέπει το Ημερολόγιο κάθε Χρήστης ομάδας και κάθε Χρήστης πελάτη· το «Κράτηση» έρχεται από τη βάση (canBook).
// Το «Κλείνει χρόνο άλλων» έρχεται από τη βάση μαζί με τα δεδομένα (canBlockOthers), όχι από εδώ.

export interface CalendarCaps {
  canSee: boolean;
  isTeam: boolean;
}

export const calendarCaps = (viewer: Viewer): CalendarCaps => {
  const isTeam = viewer.status === "signed-in" && viewer.team !== null;
  const isClient = viewer.status === "signed-in" && !isTeam;
  return {
    canSee: isTeam || isClient,
    isTeam,
  };
};
