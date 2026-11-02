// Καθαρά κομμάτια του E4 «Νέο Γύρισμα» (prototype `screens/e4-model.tsx`), πάνω στις πραγματικές Συμφωνίες.

import { balanceText } from "../helpers";
import { formatDate } from "../helpers-time";
import { MEASURE_LABELS } from "../labels";
import type { BookingAgreement, BookingKind, NamedRef } from "../types";

const WEEKDAY_NAME = new Intl.DateTimeFormat("el-GR", {
  weekday: "long",
  timeZone: "UTC",
});

// «Τετάρτη 30/09»: η μέρα με την ημέρα της εβδομάδας γραμμένη.
export const dayWithWeekday = (iso: string): string =>
  `${WEEKDAY_NAME.format(new Date(`${iso}T00:00:00Z`))} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const isIsoDay = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

export const isPastDay = (date: string, today: string): boolean =>
  !!date && date < today;

// Οι Πελάτες των Συμφωνιών, μία φορά ο καθένας, με τη σειρά που ήρθαν.
export const uniqueClients = (
  options: readonly BookingAgreement[],
): NamedRef[] => [
  ...new Map(
    options.map((option) => [option.client.id, option.client]),
  ).values(),
];

export const FREE = "free";

// Η διάρκεια της φόρμας: ένα από τα έτοιμα κουμπιά ή «Άλλη διάρκεια» με ελεύθερη τιμή (δέχεται και κόμμα).
export const hoursOf = (duration: string, freeHours: string): number =>
  Number((duration === FREE ? freeHours : duration).replace(",", "."));

// Το κουμπί που ανάβει για μια διάρκεια: το έτοιμο αν υπάρχει, αλλιώς «Άλλη διάρκεια».
export const durationChoiceOf = (
  hours: number,
  presets: readonly number[],
): string => (presets.includes(hours) ? String(hours) : FREE);

// Το υπόλοιπο του είδους στην τρέχουσα Περίοδο, χωρίς ποσά (ίδιο κείμενο με την παλιά φόρμα).
export const kindBalanceLine = (kind: BookingKind): string =>
  `${MEASURE_LABELS[kind.measure]} · ${
    kind.balance === null
      ? "χωρίς μέτρηση στην τρέχουσα Περίοδο"
      : balanceText(kind.balance)
  }`;

export const periodLine = (agreement: BookingAgreement): string | null =>
  agreement.period
    ? `Περίοδος ${agreement.period.n} · ${formatDate(agreement.period.starts)}–${formatDate(agreement.period.ends)}`
    : null;
