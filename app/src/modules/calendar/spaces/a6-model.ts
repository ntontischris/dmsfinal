// A6 (νέα εμφάνιση): η φόρμα του Κλεισμένου χρόνου από το prototype (`screens/a6-model.ts`). Καθαρές συναρτήσεις.
// Η βάση ξανελέγχει τα πάντα· εδώ πιάνονται νωρίς μόνο οι μισές ή λάθος ημερομηνίες και ώρες. Ο τίτλος είναι προαιρετικός
// (όπως στο σχήμα του server), γι' αυτό ο κανόνας «ο τίτλος είναι υποχρεωτικός» του prototype λείπει.

import type { BlockedTimeValues } from "../blocked-form";
import type { BlockedKind } from "../types";

export interface Draft {
  personId: string;
  date: string;
  untilDate: string;
  from: string;
  to: string;
  allDay: boolean;
  label: string;
  // Το Είδος· κενό = χωρίς Είδος («Κλεισμένος χρόνος»). Στέλνεται από το ίδιο το πεδίο (name="kindId").
  kindId: string;
}

const DEFAULT_FROM = "09:00";
const DEFAULT_TO = "10:00";

export const draftOf = (values: BlockedTimeValues): Draft => ({
  personId: values.userId,
  date: values.day,
  untilDate: values.untilDay ?? "",
  from: values.allDay ? DEFAULT_FROM : values.from,
  to: values.allDay ? DEFAULT_TO : values.to,
  allDay: values.allDay,
  label: values.title,
  kindId: values.kindId ?? "",
});

// Το πεδίο ημερομηνίας δίνει "" ή χρονιά όπως 0002 όσο γράφεις: ό,τι δεν είναι πλήρης μέρα αγνοείται.
export const isFullDay = (value: string): boolean => {
  if (!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T12:00Z`);
  return (
    !Number.isNaN(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
  );
};

const toMinutes = (clock: string): number => {
  const [hours = 0, minutes = 0] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

export const validateDraft = (draft: Draft): string | null => {
  if (draft.date === "") return "Διάλεξε μέρα.";
  if (!isFullDay(draft.date))
    return "Η μέρα δεν είναι σωστή. Γράψ' τη ολόκληρη, π.χ. 29/09/2026.";
  if (draft.allDay && draft.untilDate !== "" && !isFullDay(draft.untilDate))
    return "Η «Έως μέρα» δεν είναι σωστή. Γράψ' τη ολόκληρη, π.χ. 30/09/2026.";
  if (draft.allDay)
    return draft.untilDate !== "" && draft.untilDate < draft.date
      ? "Η «Έως μέρα» πρέπει να είναι ίδια ή μετά την αρχική."
      : null;
  if (draft.from === "" || draft.to === "") return "Γράψε ώρα αρχής και τέλους";
  return toMinutes(draft.to) <= toMinutes(draft.from)
    ? "Η ώρα «Έως» πρέπει να είναι μετά την ώρα «Από»."
    : null;
};

// Τα πεδία που στέλνονται στο saveBlockedTime (ίδια ονόματα με την παλιά φόρμα). Το άτομο στέλνεται μόνο όταν
// ο Χρήστης το διαλέγει («Κλείνει χρόνο άλλων»)· αλλιώς το αποφασίζει η βάση, όπως στην παλιά φόρμα.
export const formFieldsOf = (
  draft: Draft,
  canPickPerson: boolean,
): Readonly<Record<string, string>> => ({
  userId: canPickPerson ? draft.personId : "",
  day: draft.date,
  untilDay: draft.allDay ? draft.untilDate : "",
  allDay: draft.allDay ? "on" : "",
  from: draft.allDay ? "" : draft.from,
  to: draft.allDay ? "" : draft.to,
  title: draft.label,
});

// Τα πεδία της προειδοποίησης «στο Συνεργείο»: πάντα με το άτομο, χωρίς τίτλο (δεν αλλάζει την επικάλυψη). Όσο η φόρμα
// έχει λάθος, null: δεν ρωτάμε τη βάση για μισές ημερομηνίες.
export const conflictFieldsOf = (
  draft: Draft,
): Readonly<Record<string, string>> | null =>
  validateDraft(draft) === null
    ? { ...formFieldsOf(draft, true), title: "" }
    : null;

// Σχέδιο «3B»: το «+ <Είδος>» του Ημερολογίου ανοίγει τη φόρμα με `?kind=<id>`. Μόνο ενεργό Είδος· αλλιώς χωρίς Είδος.
export const pickedKindOf = (
  raw: string | string[] | undefined,
  kinds: readonly BlockedKind[],
): string => {
  const id = Array.isArray(raw) ? raw[0] : raw;
  return kinds.find((kind) => kind.id === id && !kind.retired)?.id ?? "";
};
