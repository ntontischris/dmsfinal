import { can, isClientViewer, type Viewer } from "@/modules/access";

import type { FinanceCaps } from "./types";

// Τι δικαιούται ο θεατής στις Εισπράξεις: λίστα με ποσά («Βλέπει Οικονομικά» + «Βλέπει ποσά»), καταχώρηση
// («Καταχωρεί Εισπράξεις») και αλλαγή Τρόπων («Διαχειρίζεται Ρυθμίσεις»). Η βάση ξαναελέγχει σε κάθε RPC.
// Η λίστα είναι όλων των Πελατών, άρα θέλει «Βλέπει ποσά» με Εύρος «όλα» (όπως η βάση).
export const financeCaps = (viewer: Viewer): FinanceCaps => ({
  canView:
    can(viewer, "finance.view") &&
    viewer.status === "signed-in" &&
    viewer.team?.permissions["finance.amounts"] === "all",
  canRegister: can(viewer, "finance.receipts"),
  canManageMethods: can(viewer, "settings.manage"),
  canRegisterInvoices: can(viewer, "finance.invoices"),
});

// Ποια όψη των Οικονομικών βλέπει ο θεατής (όπως στα Παραδοτέα): ομάδα (με ποσά), Χρήστης πελάτη με «Βλέπει Οικονομικά», ή καμία.
export type FinanceView = "team" | "client" | "none";

export const financeViewOf = (viewer: Viewer): FinanceView => {
  if (isClientViewer(viewer)) return can(viewer, "c.finance") ? "client" : "none";
  return financeCaps(viewer).canView ? "team" : "none";
};
