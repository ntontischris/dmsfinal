// Καθαρά κομμάτια της σελίδας Γυρίσματος (prototype `screens/e3-model.tsx`, `e3-notes.ts`), πάνω στην κάρτα της βάσης.

import type {
  CrewMember,
  CrewResponse,
  FilmingCard,
  FilmingState,
  ProvisionBalance,
} from "../types";
import type { BadgeTone } from "@/spaces/screens/shared";

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

export interface E3Reply {
  version: number;
  // Απάντησε στην τρέχουσα έκδοση του Δελτίου.
  isAnswered: boolean;
  canConfirm: boolean;
  canDecline: boolean;
}

// Η απάντηση του μέλους στο E3, όπως στη σημερινή σελίδα: μόνο σε ανοιχτό Γύρισμα με εκδομένο Δελτίο. Ό,τι ήδη ισχύει
// για την τρέχουσα έκδοση δεν ξαναστέλνεται.
export const replyOf = (
  member: CrewMember | undefined,
  state: FilmingState,
  sheetVersion: number | null,
): E3Reply | null => {
  if (!member || !isOpenState(state) || sheetVersion === null) return null;
  const isAnswered = member.version === sheetVersion;
  return {
    version: sheetVersion,
    isAnswered,
    canConfirm: member.response !== "confirmed" || !isAnswered,
    canDecline: member.response !== "declined" || !isAnswered,
  };
};

export interface E3Note {
  label: string;
  text: string;
}

// Οι «Σημειώσεις» της σημερινής σελίδας: μόνο όσες υπάρχουν. Την εσωτερική τη δίνει η βάση μόνο όπου επιτρέπεται.
export const notesOf = (
  card: Pick<
    FilmingCard,
    "clientNote" | "internalNote" | "rejectedReason" | "cancelledReason"
  >,
): E3Note[] =>
  [
    { label: "Σημείωση Πελάτη", text: card.clientNote },
    { label: "Εσωτερική σημείωση", text: card.internalNote },
    { label: "Λόγος απόρριψης", text: card.rejectedReason },
    { label: "Λόγος ακύρωσης", text: card.cancelledReason },
  ].flatMap((note) =>
    note.text ? [{ label: note.label, text: note.text }] : [],
  );

// Τόνος κατάστασης απάντησης Συνεργείου. Εδώ και όχι στο e3-ui («use client»), γιατί το καλεί και η σελίδα στον server.
export const responseTone = (response: string): BadgeTone | undefined =>
  response === "επιβεβαιώνω"
    ? "strong"
    : response === "δεν μπορώ"
      ? "attention"
      : "waiting";

// Το «done» της διεύθυνσης μετά από κράτηση ή μετάθεση (`?done=`): τι έγινε, και αν μπήκε σε έγκριση.
export const DONE_KINDS = ["booked", "rescheduled"] as const;
export type DoneKind = (typeof DONE_KINDS)[number];

export const doneMessage = (
  done: DoneKind,
  card: { state: FilmingState; hasPendingReschedule: boolean },
): string => {
  if (done === "booked")
    return card.state === "pending"
      ? "Η κράτηση στάλθηκε για έγκριση."
      : "Η κράτηση επιβεβαιώθηκε.";
  return card.hasPendingReschedule
    ? "Η μετάθεση στάλθηκε για έγκριση."
    : "Η μετάθεση έγινε.";
};
