// Βήμα 2 του οδηγού «Απαντώ σε Πελάτες»: οι τέσσερις επιλογές για ένα ανοιχτό Αίτημα και ποια είναι ήδη διαλεγμένη.
// Καθαρό αρχείο: το διαβάζει και ο browser.

import type { RequestKind } from "../view-schema";

export type RequestChoice = "deliverable" | "filming" | "done" | "reject";

export interface ChoiceOption {
  choice: RequestChoice;
  label: string;
  // Γιατί δεν γίνεται για αυτό το Αίτημα (το κουμπί μένει κλειστό)· null = γίνεται.
  blockedBy: string | null;
  // Προειδοποίηση πριν πατηθεί (π.χ. χωρίς ενεργή Συμφωνία).
  warning: string | null;
}

export const NO_AGREEMENT_WARNING = "Χωρίς ενεργή Συμφωνία";

const LABELS: Readonly<Record<RequestChoice, string>> = {
  deliverable: "Δημιουργία Παραδοτέου από το Αίτημα",
  filming: "Στήνω γύρισμα",
  done: "Ολοκλήρωση Αιτήματος",
  reject: "Απόρριψη",
};

const ORDER: readonly RequestChoice[] = ["deliverable", "filming", "done", "reject"];

// Η βάση φτιάχνει Παραδοτέο μόνο από Αίτημα «Νέο Παραδοτέο» και Γύρισμα μόνο από Αίτημα «Γύρισμα».
const blockedByOf = (choice: RequestChoice, kind: RequestKind): string | null => {
  if (choice === "deliverable" && kind !== "deliverable")
    return "μόνο για Αίτημα «Νέο Παραδοτέο»";
  if (choice === "filming" && kind !== "filming")
    return "μόνο για Αίτημα «Γύρισμα»";
  return null;
};

export const choicesOf = (
  kind: RequestKind,
  hasAgreement: boolean,
): ChoiceOption[] =>
  ORDER.map((choice) => ({
    choice,
    label: LABELS[choice],
    blockedBy: blockedByOf(choice, kind),
    warning:
      choice === "filming" && kind === "filming" && !hasAgreement
        ? NO_AGREEMENT_WARNING
        : null,
  }));

// Η απόφαση είναι ήδη διαλεγμένη από το είδος· Γύρισμα χωρίς ενεργή Συμφωνία → «Ολοκλήρωση».
export const defaultChoiceOf = (
  kind: RequestKind,
  hasAgreement: boolean,
): RequestChoice => {
  if (kind === "deliverable") return "deliverable";
  if (kind === "filming" && hasAgreement) return "filming";
  return "done";
};

// «Αλλαγή υπευθύνου» φαίνεται μόνο όταν υπάρχει κι άλλος στην ομάδα εκτός από εμένα.
export const hasOthersToAssign = (
  assignable: readonly { id: string }[],
  viewerId: string | null,
): boolean => assignable.some((person) => person.id !== viewerId);

// Υπεύθυνος = εγώ, αν είμαι στους υποψήφιους· αλλιώς «Χωρίς υπεύθυνο».
export const defaultAssigneeOf = (
  assignees: readonly { id: string }[],
  viewerId: string | null,
): string =>
  viewerId !== null && assignees.some((person) => person.id === viewerId)
    ? viewerId
    : "";
