// Μορφές της λίστας και της ουράς Γυρισμάτων (prototype `screens/e1-format.tsx`). Καθαρές συναρτήσεις.

const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "short" });

// Η σύντομη μέρα της εβδομάδας μιας ημέρας «ΕΕΕΕ-ΜΜ-ΗΗ».
export const weekdayOf = (date: string): string =>
  WEEKDAY.format(new Date(`${date}T12:00:00`));

export const whenLabel = (date: string, start: string, end: string): string => {
  const [, month, day] = date.split("-");
  return `${day}/${month} ${weekdayOf(date)} ${start}–${end}`;
};

// Αριθμός με τη σωστή μορφή: ενικός για 1, πληθυντικός για τα υπόλοιπα.
export const countLabel = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const waitingLabel = (hours: number): string =>
  hours >= 48
    ? countLabel(Math.round(hours / 24), "ημέρα", "ημέρες")
    : countLabel(hours, "ώρα", "ώρες");
