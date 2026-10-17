import { can, type Viewer } from "@/modules/access";

// Ποιος βλέπει ποια οικογένεια Αναφορών (κεφ. 2): μόνο για να μη δείχνουμε πλακίδιο που θα απαντούσε «χωρίς δικαίωμα».
// Η βάση ξαναελέγχει σε κάθε RPC (Ρ1) και αποφασίζει αν φαίνονται τα ποσά.
export const canSeeFinanceReports = (viewer: Viewer): boolean =>
  can(viewer, "reports.view") && can(viewer, "finance.view");
