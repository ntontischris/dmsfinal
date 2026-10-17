import { z } from "zod";

// Η προεπισκόπηση της απενεργοποίησης (N1), όπως την επιστρέφει το public.team_deactivation_preview. Τι επιστρέφει
// και γιατί δεν γίνεται το ορίζει μόνο η βάση· εδώ ομαδοποιείται για την οθόνη.

export const ASSIGNMENT_KINDS = [
  "client",
  "opportunity",
  "production",
  "task",
  "deliverable",
  "crew",
] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

export const DEACTIVATION_BLOCKS = [
  "self",
  "owner_by_non_owner",
  "last_owner",
] as const;
export type DeactivationBlock = (typeof DEACTIVATION_BLOCKS)[number];

const itemSchema = z.object({
  kind: z.enum(ASSIGNMENT_KINDS),
  id: z.string(),
  label: z.string(),
  detail: z.string(),
});

export const deactivationPreviewSchema = z.object({
  isActive: z.boolean(),
  block: z.enum(DEACTIVATION_BLOCKS).nullable(),
  items: z.array(itemSchema),
});

export type DeactivationItem = z.infer<typeof itemSchema>;
export type DeactivationPreview = z.infer<typeof deactivationPreviewSchema>;

export const BLOCK_TEXT: Readonly<Record<DeactivationBlock, string>> = {
  self: "Δεν απενεργοποιείς τον εαυτό σου.",
  owner_by_non_owner: "Τον Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης.",
  last_owner:
    "Είναι ο τελευταίος ενεργός Ιδιοκτήτης: πρώτα δώσε τον Ρόλο Ιδιοκτήτης σε άλλον.",
};

interface KindText {
  one: string;
  many: string;
  outcome: string;
}

const KIND_TEXT: Readonly<Record<AssignmentKind, KindText>> = {
  client: {
    one: "Πελάτης",
    many: "Πελάτες",
    outcome: "στην ουρά «Χωρίς υπεύθυνο»",
  },
  opportunity: {
    one: "Ευκαιρία",
    many: "Ευκαιρίες",
    outcome: "στην ουρά «Χωρίς υπεύθυνο»",
  },
  production: { one: "Παραγωγή", many: "Παραγωγές", outcome: "χωρίς Υπεύθυνο" },
  task: { one: "Εργασία", many: "Εργασίες", outcome: "χωρίς ανάθεση" },
  deliverable: {
    one: "Παραδοτέο",
    many: "Παραδοτέα",
    outcome: "χωρίς ανάθεση",
  },
  crew: {
    one: "θέση σε Συνεργείο μελλοντικού Γυρίσματος",
    many: "θέσεις σε Συνεργεία μελλοντικών Γυρισμάτων",
    outcome: "χωρίς το μέλος, με σήμα «άδειασε θέση»",
  },
};

export interface AssignmentGroup {
  kind: AssignmentKind;
  title: string;
  names: readonly string[];
}

const nameOf = (item: DeactivationItem): string =>
  item.detail ? `${item.label} · ${item.detail}` : item.label;

// Μία ομάδα ανά είδος, με τη σειρά του καταλόγου και τα ονόματα όπως ήρθαν (ταξινομημένα από τη βάση).
export function assignmentGroups(
  items: readonly DeactivationItem[],
): AssignmentGroup[] {
  return ASSIGNMENT_KINDS.flatMap((kind) => {
    const names = items.filter((item) => item.kind === kind).map(nameOf);
    if (names.length === 0) return [];
    const text = KIND_TEXT[kind];
    const noun = names.length === 1 ? text.one : text.many;
    return [
      { kind, title: `${names.length} ${noun} → ${text.outcome}`, names },
    ];
  });
}
