// Τα μηνύματα των Προτύπων και του Εξοπλισμού: τι μπήκε και τι παραλείφθηκε, με τον λόγο.
// Καθαρές συναρτήσεις (όχι αρχείο "use server"): τα actions τις καλούν.

interface SkippedMember {
  name?: string;
  reason: string;
}

interface SkippedItem {
  name?: string;
  reason: string;
}

const skippedMemberText = (member: SkippedMember): string =>
  member.reason === "busy"
    ? `${member.name ?? "Ένα μέλος"} έχει άλλο Γύρισμα εκείνη την ώρα`
    : "Ένα μέλος δεν είναι ενεργό";

const skippedItemText = (item: SkippedItem): string => {
  const name = item.name ?? "Ένα αντικείμενο";
  return item.reason === "conflict"
    ? `${name} είναι δεσμευμένο εκείνη την ώρα`
    : `${name} δεν είναι διαθέσιμο`;
};

// Η απάντηση της βάσης έχει λίστα «skipped»· χωρίς αυτήν, τίποτα δεν παραλείφθηκε.
const skippedOf = <T>(data: unknown): T[] => {
  const skipped = (data as { skipped?: unknown } | null)?.skipped;
  return Array.isArray(skipped) ? (skipped as T[]) : [];
};

export const crewAppliedNotice = (data: unknown): string => {
  const skipped = skippedOf<SkippedMember>(data);
  return skipped.length === 0
    ? "Το Πρότυπο εφαρμόστηκε στο Συνεργείο."
    : `Το Πρότυπο εφαρμόστηκε. Παραλείφθηκαν: ${skipped.map(skippedMemberText).join("· ")}.`;
};

export const equipmentNotice = (data: unknown): string => {
  const skipped = skippedOf<SkippedItem>(data);
  return skipped.length === 0
    ? "Ο Εξοπλισμός αποθηκεύτηκε."
    : `Ο Εξοπλισμός αποθηκεύτηκε. Παραλείφθηκαν: ${skipped.map(skippedItemText).join("· ")}.`;
};
