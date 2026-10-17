import type { ReactNode } from "react";

import type { Viewer } from "@/modules/access";

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
}

// Ενέργεια πάνω σε μια Αναφορά (π.χ. «Εξαγωγή σε Excel» στο Ργ). null = δεν ισχύει για αυτή την Αναφορά ή τον θεατή.
export type ReportAction = (props: {
  report: ReportDefinition;
  filters: ReportFilters;
  viewer: Viewer;
}) => ReactNode;
