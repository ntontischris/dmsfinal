import { can, type Viewer } from "@/modules/access";

// Ποιος βλέπει τις Αναφορές πωλήσεων (κεφ. 2): «Βλέπει Αναφορές» + «Διαχειρίζεται Πελάτες και Ευκαιρίες», αφού οι Ευκαιρίες
// δεν έχουν χωριστό «Βλέπει». Μόνο για να μη δείχνουμε πλακίδιο που θα απαντούσε «χωρίς δικαίωμα»· η βάση ξαναελέγχει
// σε κάθε RPC (Ρ1) και αποφασίζει Εύρος και ποσά.
export const canSeeSalesReports = (viewer: Viewer): boolean =>
  can(viewer, "reports.view") && can(viewer, "clients.manage");
