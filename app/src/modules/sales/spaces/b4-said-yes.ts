// «Είπε ναι — ετοίμασε Συμφωνία» (prototype `screens/b4-said-yes.ts`): ο πελάτης συμφώνησε στην κουβέντα. Η Ευκαιρία δεν
// γίνεται κερδισμένη με το χέρι· μένει ανοιχτή μέχρι να υπογράψει ο Υπογράφων (ADR 0009).

export const SAID_YES_TEXT =
  "Ο πελάτης είπε ναι στην κουβέντα. Ετοιμάζεται η Συμφωνία για υπογραφή.";

export const saidYesNotice = (hasProposal: boolean): string =>
  [
    "Σημειώθηκε ότι ο πελάτης είπε ναι.",
    hasProposal
      ? null
      : "Η νέα πρόταση ξεκινά με τον Πελάτη και τον τίτλο της Ευκαιρίας.",
    "Η Ευκαιρία μένει ανοιχτή και γίνεται κερδισμένη μόλις υπογράψει ο Υπογράφων.",
    "Δεν ειδοποιήθηκε ακόμα κανείς· ο πελάτης παίρνει τη Συμφωνία όταν τη στείλεις.",
  ]
    .filter(Boolean)
    .join(" ");

// Το είδος της Δραστηριότητας: η «Σημείωση» αν υπάρχει στη λίστα, αλλιώς το πρώτο ενεργό είδος.
export const noteKindId = (
  kinds: readonly { id: string; label: string; isRetired: boolean }[],
): string | null => {
  const active = kinds.filter((kind) => !kind.isRetired);
  return (active.find((kind) => kind.label === "Σημείωση") ?? active[0])?.id ?? null;
};
