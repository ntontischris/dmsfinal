// Μορφή ποσών, ποσοστών, μηνών και ημερομηνιών των Αναφορών, καθαρές συναρτήσεις.
// null = ο θεατής δεν βλέπει ποσά (η βάση τα έστειλε κενά): φαίνεται «—».

const MONEY = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});
const PERCENT = new Intl.NumberFormat("el-GR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

export const DASH = "—";

export const moneyOrDash = (value: number | null): string =>
  value === null ? DASH : MONEY.format(value);

export const percentOrDash = (value: number | null): string =>
  value === null ? DASH : PERCENT.format(value);

// «2026-03» → «Μάρτιος 2026».
export const monthLabel = (month: string): string => {
  const [year, number] = month.split("-");
  const name = MONTHS[Number(number) - 1];
  return name ? `${name} ${year}` : month;
};

// «2026-03-15» → «15/03/2026».
export const dateLabel = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

export const sumOf = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);
