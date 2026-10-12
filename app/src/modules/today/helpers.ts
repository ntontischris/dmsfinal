// Μορφοποίηση των γραμμών μιας κάρτας: ώρα Αθήνας, ευρώ.

const AT_FORMAT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const EURO_FORMAT = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});

export const formatAt = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : AT_FORMAT.format(date);
};

export const formatCents = (cents: number): string =>
  EURO_FORMAT.format(cents / 100);
