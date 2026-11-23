import { can, isOwner, type Viewer } from "@/modules/access";

// «owner», «team» και «client» δεν είναι Δικαιώματα· όλα τα άλλα ελέγχονται ως Δικαιώματα (ομάδας ή πελάτη).
const allowsRequirement = (viewer: Viewer, requirement: string): boolean => {
  if (requirement === "owner") return isOwner(viewer);
  if (requirement === "team") return viewer.status === "signed-in" && viewer.team !== null;
  if (requirement === "client") return viewer.status === "signed-in" && viewer.team === null;
  return can(viewer, requirement);
};

// Τι επιτρέπεται στον θεατή, για το μοντέλο των Χώρων. Χωρίς βάση φαίνονται όλες οι οθόνες, για να περιηγείται
// κανείς το σύστημα· η καθεμία λέει ότι λείπει η βάση.
export const allowsOf =
  (viewer: Viewer) =>
  (requirement: string): boolean =>
    viewer.status === "unconfigured" ? true : allowsRequirement(viewer, requirement);
