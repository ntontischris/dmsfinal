import type { BadgeTone } from "@/spaces/screens/shared";

import type { ListItem } from "../types";

// O2 (νέα εμφάνιση): η κατάσταση μιας τιμής λίστας στη μορφή του prototype («Νέα», «Σε χρήση», «Αποσύρθηκε»).

export type O2Status = "Νέα" | "Σε χρήση" | "Αποσύρθηκε";

export const O2_STATUS_TONE: Readonly<Record<O2Status, BadgeTone>> = {
  Νέα: "waiting",
  "Σε χρήση": "ok",
  Αποσύρθηκε: "faded",
};

export const o2StatusOf = (
  item: Pick<ListItem, "isRetired">,
  uses: number,
): O2Status =>
  item.isRetired ? "Αποσύρθηκε" : uses > 0 ? "Σε χρήση" : "Νέα";

// «12 χρήσεις» · καμία λέξη για τη «Νέα» (δεν χρησιμοποιήθηκε ποτέ).
export const usesText = (status: O2Status, uses: number): string =>
  status === "Νέα" ? "" : uses === 1 ? "1 χρήση" : `${uses} χρήσεις`;

// Ο σύνδεσμος «Δείξε/Κρύψε αποσυρμένες»: ζει στη διεύθυνση της σελίδας, όπως στη σημερινή.
export const toggleRetiredHref = (showRetired: boolean): string =>
  showRetired ? "/app/settings/sales" : "/app/settings/sales?retired=1";
