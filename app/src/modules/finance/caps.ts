import { can, type Viewer } from "@/modules/access";

import type { FinanceCaps } from "./types";

// Τι δικαιούται ο θεατής στις Εισπράξεις: λίστα με ποσά («Βλέπει Οικονομικά» + «Βλέπει ποσά»), καταχώρηση
// («Καταχωρεί Εισπράξεις») και αλλαγή Τρόπων (ό,τι αλλάζει η σελίδα Ρυθμίσεων › Οικονομικά). Η βάση ξαναελέγχει σε κάθε RPC.
export const financeCaps = (viewer: Viewer): FinanceCaps => ({
  canView: can(viewer, "finance.view") && can(viewer, "finance.amounts"),
  canRegister: can(viewer, "finance.receipts"),
  canManageMethods: can(viewer, "finance.costManage"),
});
