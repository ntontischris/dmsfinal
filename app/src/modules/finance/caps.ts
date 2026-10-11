import { can, type Viewer } from "@/modules/access";

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
