import { can, type Viewer } from "@/modules/access";

// Το «Προς τιμολόγηση» θέλει και Βλέπει Οικονομικά και Βλέπει ποσά. Η βάση ξαναελέγχει σε κάθε RPC.
export interface FinanceCaps {
  canView: boolean;
}

export const financeCaps = (viewer: Viewer): FinanceCaps => ({
  canView: can(viewer, "finance.view") && can(viewer, "finance.amounts"),
});
