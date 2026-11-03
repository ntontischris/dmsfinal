import { ErrorNotice } from "@/spaces/screens/shared";

import { getBlockedKinds } from "../queries";
import { BlockedKindsEditor } from "./o4-kinds";

import "./kind-tone.css";

// Το μέρος «Ημερολόγιο» των Ρυθμίσεων › Γυρίσματα (O4): η λίστα των Ειδών κλεισμένου χρόνου. Η σελίδα το δίνει έτοιμο
// στην O4 (όπως το μέρος του Google), γιατί τα Είδη ανήκουν στο Ημερολόγιο. Το Δικαίωμα το ελέγχει η O4 και η βάση.
export async function SpacesBlockedKinds() {
  const kinds = await getBlockedKinds();
  if (!kinds.ok) return <ErrorNotice what="τα Είδη κλεισμένου χρόνου" />;
  return <BlockedKindsEditor kinds={kinds.data} />;
}
