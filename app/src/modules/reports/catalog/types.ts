import type { ReactNode } from "react";

import type { Viewer } from "@/modules/access";

import type { ExportColumn } from "../export/columns";
import type { PeriodCode } from "../url";

// Το συμβόλαιο του μητρώου Αναφορών. Μία Αναφορά = ένα αρχείο στο reports/ (π.χ. reports/turnover-monthly.tsx) που
// εξάγει ένα ReportDefinition· η οικογένειά της την προσθέτει στη λίστα της (catalog/finance.ts, catalog/sales.ts).
// Ο σκελετός της M1 (components/reports-screen.tsx) δεν αλλάζει για νέα Αναφορά.

export type ReportFamily = "finance" | "sales";

// Τα φίλτρα της διεύθυνσης, ήδη ελεγμένα (άγνωστη Περίοδος → προεπιλογή, μη έγκυρος Πελάτης → κανένας).
export interface ReportFilters {
  period: PeriodCode;
  clientId?: string;
  // Ο Πωλητής (?seller=) για τις Αναφορές πωλήσεων (Ρβ)· η βάση ελέγχει το Εύρος.
  sellerId?: string;
}

export interface ReportBodyProps {
  report: ReportDefinition;
  filters: ReportFilters;
  viewer: Viewer;
  // Ό,τι προσθέτει το catalog/actions.ts (π.χ. τα κουμπιά Εξαγωγής του Ργ), έτοιμο για την Αναφορά.
  actions: ReactNode;
}

export interface ReportDefinition {
  // Το ?report= της διεύθυνσης· σταθερό, γιατί ζει σε σελιδοδείκτες.
  id: string;
  family: ReportFamily;
  title: string;
  answers: string;
  basis: string;
  usesPeriod: boolean;
  // Μόνο για να μη δείχνουμε πλακίδιο που θα απαντούσε «χωρίς δικαίωμα»· η βάση ξαναελέγχει σε κάθε RPC (Ρ1).
  isVisible: (viewer: Viewer) => boolean;
  // Server component: φορτώνει το δικό του RPC και δείχνει δεδομένα, άδειο ή σφάλμα.
  Body: (props: ReportBodyProps) => Promise<ReactNode>;
  // Εξαγωγή όπως φαίνεται (Ργ). Χωρίς αυτό η Αναφορά δεν έχει κουμπί «Εξαγωγή». Βλ. ReportExportSpec.
  exportSpec?: ReportExportSpec;
}

// Ποια φίλτρα της διεύθυνσης δέχεται το RPC: period → p_period, client → p_client, seller → p_seller.
export type ReportExportParam = "period" | "client" | "seller";

// Το συμβόλαιο της Εξαγωγής μιας Αναφοράς (Ργ), ίδιο για όλες τις οικογένειες. Η βάση (public.export_report) καλεί το
// ίδιο public.report_* RPC της Αναφοράς με τα ίδια φίλτρα, άρα το ίδιο Δικαίωμα και τα ίδια ποσά (Ρ1), γράφει Ίχνος και
// δίνει το JSON του· το αρχείο έχει μία γραμμή ανά στοιχείο του data[rowsKey], με τις στήλες εδώ (κλειδί = διαδρομή
// μέσα στη γραμμή, π.χ. "buckets.1"), και προαιρετικά μια γραμμή συνόλων από το data[totals.key].
// Νέα Αναφορά (π.χ. του Ρβ) γίνεται εξαγώγιμη μόνο με αυτό το πεδίο· ούτε η βάση ούτε το κουμπί αλλάζουν.
export interface ReportExportSpec {
  // Το όνομα του RPC χωρίς schema, π.χ. "report_turnover_by_client" (πρέπει να αρχίζει από report_).
  rpc: string;
  params: readonly ReportExportParam[];
  // Ο πίνακας γραμμών στο JSON, π.χ. "rows" ή "months".
  rowsKey: string;
  columns: readonly ExportColumn[];
  totals?: { key: string; label: string };
}

// Ενέργεια πάνω σε μια Αναφορά (π.χ. «Εξαγωγή σε Excel» στο Ργ). null = δεν ισχύει για αυτή την Αναφορά ή τον θεατή.
export type ReportAction = (props: {
  report: ReportDefinition;
  filters: ReportFilters;
  viewer: Viewer;
}) => ReactNode;
