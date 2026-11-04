// «Αλλαγή στοιχείων» στη Σελίδα Πελάτη: τι λείπει, και τι άλλαξε μετά την αποθήκευση.

export interface ContactDraft {
  name: string;
  phone: string;
  email: string;
  legalName: string;
  city: string;
  afm: string;
}

const LABELS: Readonly<Record<keyof ContactDraft, string>> = {
  name: "κύριο πρόσωπο",
  phone: "τηλέφωνο",
  email: "email",
  legalName: "επωνυμία",
  city: "πόλη",
  afm: "ΑΦΜ",
};

export const contactErrors = (draft: ContactDraft): readonly string[] => {
  const errors: string[] = [];
  const email = draft.email.trim();
  if (draft.name.trim() === "") errors.push("Γράψε το όνομα του κύριου προσώπου.");
  if (draft.phone.trim() === "" && email === "") errors.push("Γράψε τηλέφωνο ή email.");
  if (email !== "" && !email.includes("@")) errors.push("Το email δεν μοιάζει σωστό.");
  return errors;
};

export const contactSavedText = (before: ContactDraft, after: ContactDraft): string => {
  const changed = (Object.keys(LABELS) as (keyof ContactDraft)[])
    .filter((key) => before[key].trim() !== after[key].trim())
    .map((key) => `${LABELS[key]} ${after[key].trim()}`);
  if (changed.length === 0) return "Δεν άλλαξε τίποτα.";
  return `Αποθηκεύτηκε: ${changed.join(", ")}. Το βλέπει όλη η ομάδα που έχει πρόσβαση στον Πελάτη.`;
};
