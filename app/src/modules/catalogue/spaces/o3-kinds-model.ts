import { formatHours } from "../helpers";
import { MEASURE_LABELS } from "../labels";
import type { ProvisionKind } from "../types";

// Τα Είδη Παροχής της O3 στη μορφή του prototype (`screens/o3-types.tsx`): κατάσταση, χρήσεις και η γραμμή στοιχείων.

export type KindStatus = "Νέα" | "Σε χρήση" | "Αποσύρθηκε";

export const kindStatusOf = (kind: ProvisionKind, uses: number): KindStatus => {
  if (kind.isRetired) return "Αποσύρθηκε";
  return uses > 0 ? "Σε χρήση" : "Νέα";
};

const measureText = (kind: ProvisionKind): string =>
  kind.measure === null ? "σε πλήθος" : MEASURE_LABELS[kind.measure];

export const kindSubOf = (kind: ProvisionKind): string =>
  [
    kind.labelEn,
    `Μονάδα: ${kind.unit}${kind.unitEn ? ` (${kind.unitEn})` : ""}`,
    `Τρόπος μέτρησης: ${measureText(kind)}`,
    `Προεπιλεγμένη διάρκεια: ${kind.defaultHours === null ? "—" : formatHours(kind.defaultHours)}`,
  ]
    .filter(Boolean)
    .join(" · ");

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό η διάρκεια είναι κείμενο.
export const hoursText = (kind?: ProvisionKind): string =>
  kind?.defaultHours == null ? "" : String(kind.defaultHours).replace(".", ",");
