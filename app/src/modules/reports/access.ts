import { can, type Viewer } from "@/modules/access";

// Ποιος βλέπει ποια οικογένεια Αναφορών (κεφ. 2): μόνο για να μη δείχνουμε πλακίδιο που θα απαντούσε «χωρίς δικαίωμα».
// Η βάση ξαναελέγχει σε κάθε RPC (Ρ1) και αποφασίζει αν φαίνονται τα ποσά.
export const canSeeFinanceReports = (viewer: Viewer): boolean =>
  can(viewer, "reports.view") && can(viewer, "finance.view");

const amountsForAll = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" &&
  viewer.team?.permissions["finance.amounts"] === "all";

// Έξοδα ανά κατηγορία (d8): «Βλέπει κόστος» ή «Βλέπει ποσά» για όλα (ο Λογιστής), όπως η βάση.
export const canSeeExpenseReports = (viewer: Viewer): boolean =>
  can(viewer, "reports.view") &&
  (can(viewer, "finance.cost") || amountsForAll(viewer));

// Έσοδα − Έξοδα = Κέρδος (d8): Οικονομικές Αναφορές και «Βλέπει κόστος και κερδοφορία».
export const canSeeProfitReport = (viewer: Viewer): boolean =>
  canSeeFinanceReports(viewer) && can(viewer, "finance.cost");

// Παραγωγές ανά κατάσταση και είδος (d8): «Βλέπει Αναφορές» και «Διαχειρίζεται Παραγωγές» (Εύρος «δικές μου» = δικές του).
export const canSeeProductionReports = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" &&
  viewer.team !== null &&
  can(viewer, "reports.view") &&
  can(viewer, "productions.manage");
