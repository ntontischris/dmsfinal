// Καθαρά κομμάτια της σελίδας Γυρίσματος (prototype `screens/e3-model.tsx`, `e3-notes.ts`), πάνω στην κάρτα της βάσης.

import type {
  CrewResponse,
  FilmingState,
  ProvisionBalance,
} from "../types";

const WEEKDAY = new Intl.DateTimeFormat("el-GR", {
  weekday: "long",
  timeZone: "UTC",
});

// «ΕΕΕΕ-ΜΜ-ΗΗ» → «Δευτέρα 21/09».
export const fmtDay = (date: string): string => {
  const [, month, day] = date.split("-");
  return `${WEEKDAY.format(new Date(`${date}T00:00:00Z`))} ${day}/${month}`;
};

export const hoursLabel = (hours: number): string =>
  `${String(hours).replace(".", ",")} ${hours === 1 ? "ώρα" : "ώρες"}`;

// Η απάντηση του Συνεργείου με τις λέξεις του prototype (ταιριάζουν στο responseTone).
export const RESPONSE_WORDS: Readonly<Record<CrewResponse, string>> = {
  pending: "αναμένει",
  confirmed: "επιβεβαιώνω",
  declined: "δεν μπορώ",
};

export const isOpenState = (state: FilmingState): boolean =>
  state === "pending" || state === "scheduled";

// Τι λέει η σελίδα όταν λείπει Συνεργείο ή Εξοπλισμός: γιατί λείπει και τι γίνεται μετά.
export const emptyCrewNote = (
  state: FilmingState,
  canApprove: boolean,
): string => {
  if (state !== "pending")
    return "Δεν έχει οριστεί Συνεργείο. Πρόσθεσε άτομο ή πρότυπο από κάτω.";
  return canApprove
    ? "Περιμένει έγκριση. Πρώτα έγκρινέ το (πάνω), μετά όρισε το Συνεργείο· όποιος μπει ειδοποιείται."
    : "Περιμένει έγκριση. Το Συνεργείο ορίζεται μετά την έγκριση· όποιος μπει ειδοποιείται.";
};

export const emptyEquipmentNote = (state: FilmingState): string =>
  state === "pending"
    ? "Περιμένει έγκριση. Ο Εξοπλισμός δεσμεύεται μετά την έγκριση και θα φανεί εδώ."
    : "Δεν έχει δεσμευτεί Εξοπλισμός ακόμα.";

export interface E3Balance {
  total: number;
  used: number;
  reserved: number;
  left: number;
  kindLabel: string;
}

// Η Παροχή της Περιόδου: σύνολο = όσα δόθηκαν + όσα μεταφέρθηκαν.
export const balanceOf = (provision: ProvisionBalance): E3Balance => ({
  total: provision.given + provision.carried,
  used: provision.used,
  reserved: provision.reserved,
  left: provision.balance,
  kindLabel: provision.kind.label,
});
